# Trade Flow (In/Out) TODO

## Goal
Add reliable `Trades In`, `Trades Out`, and `Net Trades` insight to the Player `Ownership` card.

## Current State (as of March 4, 2026)
- `player_current.transfers` column exists (`jsonb`).
- Upstream type currently treats `transfers` as generic JSON (`Record<string, unknown>`).
- API/client schema also exposes `transfers` as generic (`z.any()`).
- Live DB currently has `transfers = {}` for all players (expected early in season before first full round data is available).

## Why It Is Not Fully Enabled Yet
- No confirmed non-empty payload shape yet (unknown exact keys for in/out/net).
- Rendering strict metrics now risks incorrect mapping.

## TODO When Data Appears
1. Sample non-empty `player_current.transfers` payloads from DB.
2. Document exact upstream key paths for:
   - trades in
   - trades out
   - net trades (or compute `in - out`)
3. Replace generic parser with explicit key mapping in UI/API.
4. Add typed schema in `packages/types/src/players.ts` for transfer shape.
5. Add guard/fallback behavior for missing weekly values.
6. Add a small test fixture (or integration assertion) for transfer mapping.

## Acceptance Criteria
- Ownership card shows correct `Trades In`, `Trades Out`, `Net Trades` for players with data.
- No false values displayed when transfer data is missing.
- Transfer shape is typed (not `any`) in shared types.
