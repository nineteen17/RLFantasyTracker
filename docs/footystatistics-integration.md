# Footystatistics Full-History Backfill

## Goal

Ingest as much player stat history as Footystatistics provides into a new match-level table, while keeping existing app tables/queries intact.

## Implemented Script

Path:
- `app/api/src/scripts/backfill-footystats-history.ts`

NPM command:
- `npm run backfill:footystats -- [flags]`

DB change (additive, non-breaking):
- new table: `player_match_stats_history`
- existing `player_round_stats` remains and is still populated for compatibility
- migration file: `app/api/drizzle/0003_tense_corsair.sql`

Apply migration before non-dry runs:

```bash
cd app/api
npm run db:migrate
```

## Required Environment

Set in `app/api/.env`:

> Security: keep real auth values only in local `.env` and never commit them.

```bash
FOOTY_STATS_COOKIE="<REDACTED>"
FOOTY_STATS_XSRF_TOKEN="<REDACTED>"
FOOTY_STATS_USER_AGENT="Mozilla/5.0 ..."
FOOTY_STATS_TEST_PLAYER_ID="509579"
```

## Preflight Check

```bash
cd app/api
set -a; source .env; set +a
curl "https://footystatistics.com/api/player-stats?player_id=${FOOTY_STATS_TEST_PLAYER_ID}" \
  -H "Cookie: $FOOTY_STATS_COOKIE" \
  -H "X-XSRF-TOKEN: $FOOTY_STATS_XSRF_TOKEN" \
  -H "User-Agent: $FOOTY_STATS_USER_AGENT"
```

Expected:
- HTTP 200
- JSON with `stats[]`

## Run Examples

Dry run (recommended first):

```bash
cd app/api
npm run backfill:footystats -- --dry-run --limit 25
```

Single player:

```bash
cd app/api
npm run backfill:footystats -- --dry-run --player-id 509579
```

Full run:

```bash
cd app/api
npm run backfill:footystats
```

Resume from player id:

```bash
cd app/api
npm run backfill:footystats -- --resume-from 507000
```

## Supported Flags

- `--dry-run`
- `--player-id <id>`
- `--limit <n>`
- `--resume-from <playerId>`
- `--delay-ms <ms>` (default `1000`)
- `--timeout-ms <ms>` (default `15000`)
- `--max-retries <n>` (default `5`)
- `--reference-season <year>` (default `currentSeason - 1`)
- `--output-dir <path>` (default `reports/footystats-backfill`)
- `--no-transfer-updates`

## Important Schema Constraint (Handled)

`player_round_stats` has PK `(season, round_id, player_id)`.

Footystatistics can return multiple entries for the same `(season, round, player)` (for example pre-season trial + NRL).
Because schema allows only one row, the script dedupes per key using priority:

1. `nrl`
2. `finals`
3. `pre-season-trial`
4. other types

Tie-breakers prefer rows with fantasy points and later match date.

## Round FK Handling (Handled)

`player_round_stats.round_id` references `rounds.round_id`.

If a historical `round_id` is missing, script inserts a stub row into `rounds` (`Round {id}`) so inserts do not fail.

## Transfer Update Logic (Conservative)

Script ingests all history, but updates `players.original_squad_id` conservatively:

- Uses `reference season` first (default previous season, currently `2025`), then falls back one season (`2024`) if no usable reference-season row exists.
- Prefers `nrl/finals` rows for that season.
- Only updates when:
  - derived squad differs from current `players.squad_id`
  - existing `original_squad_id` is null/0

This avoids overfitting team switches from deep historical seasons.

## Reports

After each run, script writes JSON reports to `output-dir`:

- `summary-*.json`
- `failures-*.json`

## What You Need To Do

Before run:
1. Keep auth values current in `.env`.
2. Run preflight check.
3. Start with dry run and inspect report.

During run:
1. If auth expires (401/403), refresh cookie/XSRF and rerun with `--resume-from`.

After run:
1. Validate sample players against UI/API.
2. Review transfer updates before removing any static transfer fallback logic.
