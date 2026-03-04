# Off-Season Transfer Handling

## The Problem

The NRL Fantasy API sets `original_squad_id = 0` and `transfer_round = 0` for players who move clubs during the off-season. It only populates these fields for mid-season transfers. This means our system can't distinguish between a player who has always been at their current club and one who arrived in the off-season.

This broke the **Teammate Impact** feature. The `wereTeammatesLastSeason()` function falls back to `squadId` (the current club) when `originalSquadId` is null, so a player like Sandon Smith — who moved from the Roosters to the Knights — was incorrectly treated as having been at the Knights in 2025. His 17 rounds of 2025 Roosters scores were matched against Knights teammates' 2025 scores, producing wildly inflated "games played together" counts (e.g. 13 games with Fletcher Sharpe when the real answer is 1).

The same bug affected every off-season signing: Dylan Brown (Eels to Knights), Daly Cherry-Evans (Sea Eagles to Roosters), David Fifita (Titans to Rabbitohs), etc.

## The Fix

### 1. Static map for known transfers

`app/api/src/worker/syncers/data/off-season-transfers.ts` contains a mapping of `playerId → 2025 squadId` for all 55 known 2026 off-season transfers. The syncer uses this as a fallback when the API doesn't provide `original_squad_id`.

This map needs updating at the start of each new NRL season.

### 2. Auto-detection in the syncer

`app/api/src/worker/syncers/players.syncer.ts` now pre-loads existing player records before upserting. The `resolveOriginalSquadId()` function uses a 4-step priority chain:

| Priority | Source | When it fires |
|----------|--------|---------------|
| 1 | API `original_squad_id` | Mid-season transfers the API tracks |
| 2 | DB squad change | Player's `squad_id` differs from stored value (auto-detect) |
| 3 | Existing DB value | Previously resolved `originalSquadId` — don't overwrite with null |
| 4 | Static map | First-time bootstrap when no prior data exists |

The auto-detection (priority 2) catches mid-season transfers automatically. It also catches off-season transfers **if the database persists across seasons** — the first sync of the new season sees the squad change and preserves the old value.

The static map (priority 4) is only needed when the database is fresh with no prior season data.

### 3. Dead code cleanup

Removed unused `seasonEligible` and `mSeasonRounds` variables from `getPlayedWithStats()` in `players.repository.ts`. These were computed per-teammate but never passed to `computePeriod()`.

## How `wereTeammatesLastSeason` works

```
targetSquad2025 = target.originalSquadId ?? target.squadId
mateSquad2025   = mate.originalSquadId   ?? mate.squadId
return targetSquad2025 === mateSquad2025
```

With `originalSquadId` correctly set:
- Sandon Smith (originalSquadId = Roosters) vs Kalyn Ponga (originalSquadId = null → Knights) → **false** — 2025 data excluded
- Kalyn Ponga vs Bradman Best (both null → both Knights) → **true** — 2025 data included

## Maintenance

At the start of each NRL season:

1. Update `off-season-transfers.ts` with the new season's transfers
2. Run a sync — the static map populates `originalSquadId` for the new transfers
3. Subsequent syncs preserve these values via priority 3 (existing DB value)

If the database is **not** reset between seasons, priority 2 (auto-detection) handles most transfers automatically and the static map only needs entries for edge cases the auto-detection misses.

## Files involved

| File | Role |
|------|------|
| `app/api/src/worker/syncers/data/off-season-transfers.ts` | Static transfer map (55 players for 2026) |
| `app/api/src/worker/syncers/players.syncer.ts` | `resolveOriginalSquadId()` — 4-step resolution |
| `app/api/src/logic/model/players/players.repository.ts` | `wereTeammatesLastSeason()` + `getPlayedWithStats()` |
