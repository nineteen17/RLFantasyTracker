# Played With Stats

Calculate a player's average fantasy points when a particular teammate is (or isn't) playing. Surfaces teammate impact — e.g. "Kalyn Ponga averages 12 more points when Fletcher Sharpe is playing."

Returns three time periods: **current season (2026)**, **last season (2025)**, and **total (combined)**.

---

## Why this is possible with existing data

No new tables, no new sync logic, no schema changes required.

We already have everything we need:

| Data | Location | What it gives us |
|------|----------|-----------------|
| Squad membership | `players.squadId` | Current squad |
| Transfer tracking | `players.originalSquadId`, `players.transferRound` | Pre-transfer squad + when they moved |
| 2026 per-round scores | `playerCurrent.scores` (JSONB) | `{ "1": 80, "2": 55 }` — current season |
| 2025 per-round scores | `playerCurrent.lastSeasonScores` (JSONB) | `{ "1": 65, "2": 70 }` — last season |

**Key insight**: In NRL, each team plays exactly one match per round. If two players on the same squad both have a score for the same round, they played together in that match. If only one has a score, the other was injured/dropped/rested.

---

## Squad membership across seasons

To know if two players were teammates in a given round, we need to know which squad they were on at the time.

### 2026 (current season)

- Use `players.squadId` (current squad)
- If a player has `transferRound > 0` AND `originalSquadId !== squadId`, they transferred mid-season. Only count rounds **after** `transferRound` as being on the current squad, and rounds **before** as being on `originalSquadId`

### 2025 (last season)

- Players with `originalSquadId === squadId` (or `originalSquadId` is null and `transferRound === 0`): they were at the same club in 2025 — use all `lastSeasonScores` rounds
- Players with `originalSquadId !== squadId` and `transferRound > 0`: they transferred between seasons (or during 2026). Their 2025 scores were at `originalSquadId`, not their current squad — so they were **not** teammates in 2025 unless the target player was also at that same squad

In practice this means: for a 2025 comparison, only include teammates where both players were at the same club in 2025.

---

## How it works

### Step 1 — Load data

Fetch the target player and all players on the same squad, with both `scores` and `lastSeasonScores` from `playerCurrent`, plus `originalSquadId` and `transferRound` from `players`.

### Step 2 — Determine eligible rounds per season

For each player pair (target A, teammate B), figure out which rounds they were on the same squad:

**2026 rounds**: Both on the same `squadId`. If either transferred mid-season, only include rounds after their `transferRound`.

**2025 rounds**: Both at the same club last season (determined by `originalSquadId` logic above).

### Step 3 — Find round overlap within eligible rounds

```
2026:
  Player A scores: { "1": 80, "2": 55, "3": 70, "4": 62 }
  Player B scores: { "1": 45, "3": 60 }
  → together: [1, 3], without: [2, 4]

2025:
  Player A lastSeasonScores: { "1": 60, "2": 48, "3": 72, "5": 55 }
  Player B lastSeasonScores: { "1": 30, "2": 44, "5": 38 }
  → together: [1, 2, 5], without: [3]
```

### Step 4 — Calculate averages per period

```
2026:
  avgWith    = (80 + 70) / 2 = 75.0
  avgWithout = (55 + 62) / 2 = 58.5
  delta      = +16.5
  gamesWith  = 2

2025:
  avgWith    = (60 + 48 + 55) / 3 = 54.3
  avgWithout = 72 / 1 = 72.0
  delta      = -17.7
  gamesWith  = 3

Total (merge all eligible rounds):
  avgWith    = (80 + 70 + 60 + 48 + 55) / 5 = 62.6
  avgWithout = (55 + 62 + 72) / 3 = 63.0
  delta      = -0.4
  gamesWith  = 5
```

### Step 5 — Filter and sort

- Require a minimum of **2 games together** (applied to the **total** count) to avoid noise
- Sort by total `delta` descending — biggest positive impact first
- Include game counts per period so users can judge sample size

---

## API endpoint

```
GET /api/players/:player_id/played-with
```

### Query params

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `minGames` | number | 2 | Minimum total games together to include a teammate |

### Response

```json
{
  "playerId": 500123,
  "playerName": "Kalyn Ponga",
  "squadId": 500011,
  "overallAvg": {
    "season": 66.75,
    "lastSeason": 58.2,
    "total": 61.5
  },
  "teammates": [
    {
      "playerId": 500456,
      "playerName": "Fletcher Sharpe",
      "season": {
        "gamesWith": 8,
        "gamesWithout": 2,
        "avgWith": 72.5,
        "avgWithout": 43.0,
        "delta": 29.5
      },
      "lastSeason": {
        "gamesWith": 15,
        "gamesWithout": 5,
        "avgWith": 62.0,
        "avgWithout": 50.0,
        "delta": 12.0
      },
      "total": {
        "gamesWith": 23,
        "gamesWithout": 7,
        "avgWith": 65.4,
        "avgWithout": 47.7,
        "delta": 17.7
      }
    }
  ]
}
```

A period object is `null` if there's no data for that period (e.g. player wasn't at the club in 2025).

### Edge cases

- **Player not found or no scores**: Return 404 or empty `teammates` array
- **All teammates played every game** (no variance): `avgWithout` is `null`, `delta` is `null` — they always play together so there's no comparison
- **Transferred players**: Handled by squad membership logic above — rounds are only included when both players were at the same club
- **No 2025 data**: `lastSeason` is `null` for that teammate. `total` falls back to current season only
- **Rookie with no 2025 data**: `lastSeason` and `total` may be sparse — `minGames` filter handles this

---

## Files to modify

| File | Change |
|------|--------|
| `app/api/src/logic/model/players/players.repository.ts` | Add `getPlayedWithStats()` function |
| `app/api/src/app.ts` | Register `GET /api/players/:player_id/played-with` route |
| `app/api/src/config/openapi/openapi.registry.ts` | Register OpenAPI schema for the endpoint |
| `packages/types/src/players.ts` | Add `PlayedWithResponseSchema` Zod schema |
| `packages/types/src/index.ts` | Re-export new schema |

No changes to: schema, migrations, syncers, or sync service.

---

## Implementation approach

### Repository function (`players.repository.ts`)

```
1. Fetch target player (playerId, squadId, fullName, originalSquadId, transferRound)
   + their scores and lastSeasonScores from playerCurrent
2. Fetch all other players on the same squad (current) with the same fields
3. For 2025, also fetch players who were on the same originalSquadId
   (to catch teammates who have since left)
4. For each teammate:
   a. Determine eligible 2026 rounds (both on same squad, respecting transferRound)
   b. Determine eligible 2025 rounds (both at same club last season)
   c. Compute overlap/difference for each period
   d. Calculate avgWith, avgWithout, delta per period
   e. Calculate total by merging all eligible rounds
   f. Skip if total gamesWith < minGames
5. Sort by total delta descending
6. Return structured response
```

### DB queries

**Query 1**: Fetch target player joined with playerCurrent (1 row).

**Query 2**: Fetch all players on the same current squad joined with playerCurrent (~35 rows). This covers 2026 teammates and most 2025 teammates (players who stayed).

**Query 3** (conditional): If target player transferred (`originalSquadId !== squadId`), fetch players from `originalSquadId` for 2025 comparisons. This catches former teammates. In practice this is rare and still a small query.

Total: 2-3 lightweight queries.

### Why not SQL?

The `scores` and `lastSeasonScores` fields are JSONB with dynamic keys (`{ "1": 80, "2": 55 }`). Computing set intersections and conditional averages across JSONB objects in SQL is possible but ugly and hard to maintain. The dataset is small (~35 players, ~27 rounds per season) — doing it in JS is simpler and fast.

---

## Performance

- **DB cost**: 2 queries — target player + squad mates with playerCurrent (~35 rows total)
- **JS cost**: ~35 iterations with set operations on arrays of max length 54 (27 rounds x 2 seasons)
- **Total**: Sub-millisecond computation, two DB round trips
- **No caching needed** — this is already fast enough

---

## Future extensions (not in initial scope)

- **Cross-squad analysis**: Check "played against" stats using fixtures to determine opponents
- **Populate `playerRoundStats`**: If we later need per-stat breakdowns (e.g. "Ponga makes more line breaks when Sharpe plays"), populate `playerRoundStats` from `stats/{roundId}.json` and compute stat-level teammate impact
- **Client display**: Teammate impact table on the player detail page, sortable by delta, with period tabs
