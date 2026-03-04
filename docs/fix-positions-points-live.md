# Fix: Positions, Points & Live Stats

## Issue 1: Position mapping is wrong

### Problem
The client uses a 9-position NRL system (Fullback=1, Wing=2, ..., Lock=9) but the upstream NRL Fantasy API uses a **6-position fantasy system**:

| ID | Fantasy Position |
|----|-----------------|
| 1 | Hooker |
| 2 | Middle Forward |
| 3 | Edge Forward |
| 4 | Half |
| 5 | Centre |
| 6 | Wing / Fullback |

Confirmed by checking `players.json` — Kalyn Ponga (fullback) has `positions: [6]`, Nathan Cleary (half) has `positions: [4]`, Payne Haas (prop) has `positions: [2]`.

### Fix
Update `app/client/src/lib/constants.ts` to match the 6-position fantasy system. This is the only correct mapping since the API stores these IDs in the DB.

```typescript
export const POSITION_LABELS: Record<number, string> = {
  1: "Hooker",
  2: "Middle Forward",
  3: "Edge Forward",
  4: "Half",
  5: "Centre",
  6: "Wing / Fullback",
};

export const POSITION_OPTIONS = [
  { value: 1, label: "Hooker" },
  { value: 2, label: "Middle Forward" },
  { value: 3, label: "Edge Forward" },
  { value: 4, label: "Half" },
  { value: 5, label: "Centre" },
  { value: 6, label: "Wing / Fullback" },
];
```

### Files
- `app/client/src/lib/constants.ts` — update both mappings

---

## Issue 2: Fantasy points not showing / showing -1

### Problem
Round-by-round fantasy points exist in the upstream `players.json` as `stats.scores` (e.g., `{"1": 80, "2": 55}`) but are **never synced** to the DB. The `playerRoundStats` table exists but is never populated.

### Root cause
`players.syncer.ts` syncs aggregate stats (`avgPoints`, `totalPoints`, etc.) but skips `stats.scores`.

### Fix
The simplest fix: sync `stats.scores` as a JSONB field on `playerCurrent` (like we already do for `projScores`, `breakEvens`, etc.). No need for a separate table — this keeps the pattern consistent and the data is already per-player.

**Why not `playerRoundStats`?** That table is designed for granular per-round stat breakdowns (tries, tackles, metres). The `scores` data from `players.json` is just the final fantasy points per round — a simple `Record<roundId, points>`. Storing it as JSONB on `playerCurrent` is simpler and consistent with how `projScores` and `lastSeasonScores` are already stored.

### Changes

1. **DB schema** — add `scores` JSONB column to `playerCurrent` table
2. **Players syncer** — sync `stats.scores` to the new column
3. **Shared types** — add `scores` to `PlayerCurrentSchema`
4. **Frontend** — display round scores on the player detail page (e.g., in a score history section or on the fixture strip)

### Files
- `app/api/src/database/schema.ts` — add `scores: jsonb("scores")` to `playerCurrent`
- `app/api/src/worker/syncers/players.syncer.ts` — sync `s.scores`
- `packages/types/src/players.ts` — add `scores` to `PlayerCurrentSchema`
- `app/client/src/app/players/[player_id]/components/stats-overview.tsx` or new component — display scores

---

## Issue 3: Live stats — wrong data mapping

### Problem
Three sub-issues:

#### 3a. `stats/{id}.json` is per-ROUND, not per-match
`stats/1.json` returns stats for ALL players in **Round 1** (all 8 games), not just match 1. The current code treats the `match` field as the stats URL parameter, so every match card in a round fetches the same data, and players from other games show up under "Other".

**Evidence:** `stats/1.json` has ~38 players (multiple squads), far more than the 26 in a single match.

#### 3b. No fantasy points shown on live page
The live stats panel shows raw stats (Tries, Tackles, Metres) but not the actual **fantasy points** each stat is worth. Users need to see points.

#### 3c. Fantasy points can be calculated from stats
The NRL Fantasy scoring system is well-defined:

| Stat | Points |
|------|--------|
| Try | +8 |
| Goal | +2 |
| Field Goal | +5 |
| Tackle | +1 |
| Tackle Break (LB) | +4 |
| Line Break Assist (LBA) | +2 |
| Offload | +2 |
| Forced Dropout | +2 |
| Try Assist (TB) | +5 |
| Kick Defused (KD) | +1 |
| Metres Gained | +1 per 10m |
| Kick Metres | +1 per 20m |
| Missed Tackle | -2 |
| Error | -2 |

### Fix

#### 3a. Fetch stats once per round, filter by match
Instead of fetching `stats/{matchNumber}.json` per match card, fetch `stats/{roundId}.json` **once** for the entire round, then filter players by squad ID per match.

**API change:**
- Change endpoint from `GET /api/live/stats/:match_number` to `GET /api/live/stats/:round_id`
- Return all players for the round, grouped or filterable by squad
- The frontend already knows each match's home/away squad IDs — filter client-side

**Why this is better:**
- One upstream fetch per round instead of one per match (8x reduction)
- No "Other" team problem — each match card filters to its own squads
- Simpler caching — one query key per round

#### 3b + 3c. Calculate and display fantasy points
Add a `calculateFantasyPoints(stats)` utility function that maps raw stats to points using the official scoring table. Display the total points prominently on each player row.

**Where to calculate:**
- On the API side in `live.repository.ts` — enrich each player object with a `points` field before returning
- This keeps the formula in one place (server-side) and the frontend just displays it

### Files

**API:**
- `app/api/src/logic/model/live/live.repository.ts` — change to fetch by round ID, add points calculation
- `app/api/src/logic/model/live/live.controller.ts` — update param name
- `app/api/src/logic/model/live/live.routes.ts` — change route to `:round_id`
- `app/api/src/logic/shared/constants/scoring.ts` — new file with scoring formula

**Shared types:**
- `packages/types/src/live.ts` — add `points` field to `LivePlayerStatSchema`, rename `LiveStatsResponse.matchNumber` to `roundId`

**Frontend:**
- `app/client/src/hooks/api/use-live.ts` — change hook to accept `roundId`, fetch once per round
- `app/client/src/app/live/page.tsx` — fetch round stats once, pass to match cards
- `app/client/src/app/live/components/match-card.tsx` — receive pre-filtered players instead of fetching
- `app/client/src/app/live/components/match-stats-panel.tsx` — display points column, remove separate fetch

---

## Issue 4: Live page only shows one round

### Problem
The live page only shows the active/current round. Users should be able to browse all rounds.

### Fix
- Change `GET /api/live` to return ALL rounds (not just the active one)
- Add a round selector on the frontend (default to active round)
- Keep auto-refresh behaviour for the active round only

### Files
- `app/api/src/logic/model/live/live.repository.ts` — return all rounds
- `packages/types/src/live.ts` — add `LiveRoundsListResponse` type
- `app/client/src/app/live/page.tsx` — add round selector UI

---

## Implementation order

1. Fix positions (standalone, no dependencies)
2. Sync `stats.scores` to playerCurrent (standalone)
3. Restructure live stats (round-based fetch + points calculation + all rounds)
4. Update frontend components for all changes
