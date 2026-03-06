# FootyStats Incremental History Sync Plan

## 1) Objective
Build a production-safe incremental pipeline that updates `player_match_stats_history` and `player_round_stats` with new/corrected FootyStats data without running a full all-player backfill every time.

## 2) Current State (Verified)
- Automated scheduler currently triggers only `runLightSync` / `runFullSync` (current/live ecosystem data).
- Historical match ingestion is currently manual via `npm run backfill:footystats`.
- Scoring tabs in Player Profile are already wired to history endpoint and now correctly split official vs preseason in API + client safety filter.

## 3) Decision Summary
- Keep full backfill script for repair/reseed only.
- Add a new incremental history sync runner for scheduler usage.
- Add conservative guardrails so it is safe under rate limiting and auth expiry.
- Roll out behind feature flag.

## 4) Design Principles
- Idempotent writes: rely on existing upsert keys.
- Small, bounded runs: process only likely-affected players.
- Recoverability: checkpoint + lookback window to avoid missing late updates.
- Safe-by-default: if FootyStats auth env vars are missing/invalid, skip history sync and keep core sync functioning.
- Reuse existing normalization/dedupe/upsert logic to avoid divergence.

## 5) Proposed Architecture

### 5.1 Extract shared ingestion module
Create reusable module from current backfill script internals:
- `app/api/src/worker/history/footystats-history.ingest.ts`

Move reusable pieces here:
- `fetchPlayerStatsWithRetry`
- `normalizeStats`
- `dedupeBySeasonMatch`
- `dedupeBySeasonRound`
- `ensureRoundExists`
- `upsertMatchAndRoundRows` (new function wrapping current transaction logic)

Reason:
- Full backfill and incremental runner use exactly same row semantics.
- One source of truth for parsing/dedupe/upsert behavior.

### 5.2 New incremental runner
Create:
- `app/api/src/worker/history/footystats-history.incremental.ts`

Public API:
- `runIncrementalHistorySync(options?: IncrementalOptions): Promise<IncrementalRunResult>`

Suggested `IncrementalOptions`:
- `dryRun?: boolean`
- `season?: number` (default current season)
- `lookbackRounds?: number` (default `3`)
- `delayMs?: number` (default `400`)
- `maxRetries?: number` (default `3`)
- `timeoutMs?: number` (default `12000`)
- `maxPlayers?: number` (default `250`)
- `applyTransferUpdates?: boolean` (default `false`)
- `reason?: "match-complete" | "round-complete" | "nightly-reconcile" | "manual"`

### 5.3 Checkpoint table
Add table in schema:
- `history_sync_checkpoint`

Columns:
- `key` text PK (`"footystats-history"`)
- `lastRunStartedAt` timestamptz
- `lastRunCompletedAt` timestamptz nullable
- `lastSeason` int nullable
- `lastRound` int nullable
- `lastStatus` text (`success` / `partial` / `failed`)
- `lastSummary` jsonb nullable
- `updatedAt` timestamptz default now

Reason:
- Enables deterministic incremental window + operational visibility.

### 5.4 Candidate player selection (core incremental logic)
Algorithm for a run:
1. Resolve target season from `rounds` table (max season in current data).
2. Resolve active round (if any) and latest completed round.
3. Compute target rounds:
- Base window: `[max(1, latestCompletedRound - lookbackRounds + 1) .. latestCompletedRound]`
- If checkpoint has older `lastRound`, include gap rounds up to latest completed round.
4. Find target fixtures for target rounds in season.
5. Candidate squads = all home/away squads from target fixtures.
6. Candidate players:
- `players` with `squadId in candidateSquads` and `active = true`
- union with players already present in `player_match_stats_history` for target fixture match ids (captures transfers/retirements)
7. Apply cap (`maxPlayers`) with deterministic ordering (`playerId asc`) and record if capped.
8. For each candidate player:
- Fetch FootyStats rows.
- Normalize/dedupe.
- Filter to target season + target rounds (plus fallback: rows with `matchDate >= now - 35 days`).
- Upsert.
9. Update checkpoint with run summary.

Notes:
- This is not "single-round only"; it intentionally has a rolling reconciliation window.
- Rolling window catches stat corrections and delayed upstream updates.

## 6) Scheduler Integration

### 6.1 Feature flag
Add env flags:
- `ENABLE_HISTORY_SYNC` default `false` (initial rollout)
- `HISTORY_SYNC_LOOKBACK_ROUNDS` default `3`
- `HISTORY_SYNC_MAX_PLAYERS` default `250`
- `HISTORY_SYNC_DELAY_MS` default `400`

### 6.2 Trigger points
In `app/api/src/worker/scheduler.ts`:
- After `runLightSync()` on `match-complete`, trigger incremental history sync.
- After `runFullSync()` on `round-complete`, trigger incremental history sync.
- Add nightly reconcile cron (once daily) for incremental history sync with same window.

### 6.3 Locking
- Add separate in-memory lock for history sync (`historySyncing`) so history runs do not overlap with themselves.
- Keep existing sync lock unchanged.
- If multi-instance deployment is expected, add DB advisory lock in incremental runner to prevent cross-instance overlap.

## 7) Script + Commands

### 7.1 New command
In `app/api/package.json` add:
- `sync:footystats:incremental`: runs incremental runner manually.

### 7.2 Existing command remains
- Keep `backfill:footystats` as full repair command.
- Do not wire full backfill into scheduler.

## 8) Error Handling and Safety
- If `FOOTY_STATS_COOKIE`, `FOOTY_STATS_XSRF_TOKEN`, or `FOOTY_STATS_USER_AGENT` missing:
- Log warning, skip history sync, return `status = skipped_missing_auth`.
- Retry on `429` and `>=500` with backoff + jitter (reuse existing behavior).
- If partial failures occur:
- Persist failed player IDs in `lastSummary`.
- Mark checkpoint `partial` and retry next trigger (rolling window recovers).

## 9) Observability
- Structured run summary per execution:
- `reason`
- `season`
- `targetRounds`
- `playersQueued/Processed/Failed`
- `rowsUpsertedMatch/rowsUpsertedRound`
- `durationMs`
- `status`
- Keep JSON report writing only for manual full backfill; for scheduler incremental rely on logs + checkpoint row.

## 10) Testing Plan

### 10.1 Unit tests (new)
- Match row normalization and dedupe priority.
- Candidate player selection from fixtures/squads/history.
- Incremental window computation from checkpoint + latest completed round.

### 10.2 Integration tests (new)
- Incremental run upserts expected rows for mocked FootyStats responses.
- Re-run is idempotent (same inputs, no semantic drift).
- Missing auth env leads to safe skip, not crash.

### 10.3 Manual verification checklist
1. Run incremental dry-run against current season.
2. Confirm candidate set is much smaller than full player table.
3. Run live incremental once and inspect upsert counts.
4. Open Player Scoring tabs for players in last completed round and verify updates appear.

## 11) Rollout Plan

### Phase A: Refactor + incremental runner (no scheduler)
- Implement shared ingestion module.
- Implement incremental runner + command.
- Run manually in staging-like env.

### Phase B: Controlled production trial
- Enable `ENABLE_HISTORY_SYNC=true` on one environment.
- Keep conservative limits (`maxPlayers=120`, `lookbackRounds=2`).
- Observe logs/checkpoint for 3-5 days.

### Phase C: Full enablement
- Raise limits to desired defaults.
- Keep full backfill manual-only.

### Phase D: Operational hardening
- Optional DB advisory lock.
- Optional alerts on consecutive `partial/failed` runs.

## 12) Acceptance Criteria
- Scheduler updates history without manual full backfill.
- New completed matches appear in scoring tabs within one scheduler cycle.
- Official/preseason split remains correct in all scoring sub-tabs.
- No meaningful increase in scheduler failures due to history sync.
- Incremental runtime is bounded and significantly lower than full backfill.

## 13) Exact Files Expected to Change
- `app/api/src/database/schema.ts` (checkpoint table)
- `app/api/src/worker/history/footystats-history.ingest.ts` (new)
- `app/api/src/worker/history/footystats-history.incremental.ts` (new)
- `app/api/src/worker/scheduler.ts` (trigger integration)
- `app/api/package.json` (new script command)
- `app/api/src/scripts/backfill-footystats-history.ts` (reuse shared helpers)

## 14) Risks and Mitigations
- Risk: FootyStats auth tokens expire.
- Mitigation: safe-skip mode + clear logging + no impact on main sync path.
- Risk: Missing corrected older matches.
- Mitigation: rolling lookback + nightly reconcile + periodic manual full repair.
- Risk: Multi-instance duplicate runs.
- Mitigation: advisory lock (phase D if needed).
