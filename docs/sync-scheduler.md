# Sync Scheduler

## Problem
Player data (stats, prices, ownership, break evens) is only updated when `npm run sync` is manually triggered. This means the DB goes stale unless someone remembers to run it.

## Goal
Automate syncing so the DB stays fresh without manual intervention, using smart triggers based on match activity.

## Data Change Patterns
- **Player scores/stats**: Update as each match completes
- **Prices**: Update after round lockout (typically Monday/Tuesday)
- **Ownership / trade data**: Shifts throughout the week, especially after matches
- **Break evens / projections**: Recalculated after round completion
- **Rosters / squads**: Rarely change (mid-season transfers only)

## Sync Types

### Light sync
Syncs: `players.json` + `coach/players.json`
Purpose: Get latest scores, ownership, break evens, projections
Speed: Fast (2 upstream fetches + DB upserts)

### Full sync
Syncs: All endpoints (`squads`, `venues`, `rounds`, `players`, `coach`) + `deriveMetrics`
Purpose: Recalculate value scores, PPM, and catch any structural changes
Speed: Slower (5 upstream fetches + derives)

## Triggers

### 1. Match completion (reactive)
- **How**: Background poller checks `rounds.json` every 5 minutes during active rounds
- **When**: Detects a match status flip from `"playing"` → `"complete"`
- **Runs**: Light sync
- **Why**: Player scores and stats are finalised after each game
- **Stops polling**: When no matches are `"playing"` or `"scheduled"` for the day

### 2. Round completion
- **How**: Same poller detects all matches in the round are `"complete"`
- **When**: After the last game of the round finishes
- **Runs**: Full sync (including `deriveMetrics`)
- **Why**: Prices, break evens, and derived metrics update after the full round

### 3. Daily catch-all
- **How**: Cron schedule (e.g., `node-cron`)
- **When**: 4:00 AM AEST daily
- **Runs**: Full sync
- **Why**: Catches overnight changes (trades, price adjustments, late corrections)

## Polling Logic

```
On API startup:
  - Schedule daily cron (4am AEST full sync)
  - Start match-aware poller

Match-aware poller:
  1. Fetch rounds.json
  2. Find the active round
  3. If no active round → sleep 30 minutes, retry
  4. If active round found:
     a. Track match statuses in memory
     b. Poll every 5 minutes
     c. On match "playing" → "complete":
        - Run light sync
     d. On ALL matches "complete":
        - Run full sync + deriveMetrics
        - Stop polling until next round activates
```

## Edge Cases
- **Postponed matches**: Poller handles this naturally — just keeps polling until status changes
- **Delayed kickoffs**: No issue — we react to status, not kickoff times
- **API downtime**: Poller retries next interval, logs the failure
- **Multiple matches finishing simultaneously**: Light sync runs once (debounce)
- **Server restart mid-round**: Poller picks up current state on startup, no history needed

## Implementation Notes

### Dependencies
- `node-cron` for daily schedule (already available, or lightweight addition)
- Existing `syncService.ts` for the actual sync logic
- Existing `fetchUpstream("rounds")` for polling

### Where it lives
- `app/api/src/worker/scheduler.ts` — main scheduler (starts poller + cron)
- Initialised from `src/index.ts` after the server starts listening

### Existing code to reuse
- `app/api/src/worker/syncService.ts` — `runFullSync()` already orchestrates the full sync
- `app/api/src/worker/upstream/client.ts` — `fetchUpstream("rounds")` for polling
- `app/api/src/worker/syncers/` — individual syncers for light sync subset

### Observability
- Log each poll attempt and result
- Log sync triggers with reason (match completed, round completed, daily cron)
- Log sync duration and record counts
