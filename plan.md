elow is a complete, end-to-end blueprint for your app (what it is, how it works, exact tables/columns, endpoints, and the joins). It’s designed around the public NRL Fantasy JSON feeds you found, including the per-player coach endpoint that contains BE / projections.

⸻

What the app is

A fast NRL Fantasy player intelligence site:
• Search by player (name, position, team)
• Browse by team (roster + sortable metrics)
• Player page shows:
• current price, status, positions
• ownership + captain/vc %
• break evens + projected scores + projected prices (from /coach/players/{id}.json)
• splits: vs opponents, by venue
• your enrichment: PPM, price delta, “value” score, history tables, charts
• bye schedule + fixture strip (from rounds/fixtures + team)

No paywall. Your “edge” is: clean UI + better filters + value metrics.

⸻

Architecture

Next.js (UI) → Express API → Supabase Postgres
Worker service pulls NRL JSON on schedules and upserts into Postgres.

Docker Compose on a DigitalOcean droplet:
• web (Next.js)
• api (Express)
• worker (Node cron loops)
• optional redis (nice-to-have cache)

⸻

Data sources (upstream)

You already have:

Reference
• https://fantasy.nrl.com/data/nrl/players.json
• https://fantasy.nrl.com/data/nrl/squads.json
• https://fantasy.nrl.com/data/nrl/rounds.json
• https://fantasy.nrl.com/data/nrl/venues.json

Per player analytics (includes BE/projections/splits)
• https://fantasy.nrl.com/data/nrl/coach/players/{player_id}.json

Later (in-season): add live scoring endpoints you discover via DevTools Network.

⸻

Database schema (Supabase Postgres)

1. Reference tables (rarely change)

squads
• squad_id bigint PK
• name text
• abbrev text null
• logo_url text null
• updated_at timestamptz default now()

Index:
• idx_squads_name on name

venues
• venue_id bigint PK
• name text
• city text null
• state text null
• updated_at timestamptz default now()

fixtures
• fixture_id bigint PK
• season int
• round_id int FK → rounds.round_id
• home_squad_id bigint FK → squads.squad_id
• away_squad_id bigint FK → squads.squad_id
• venue_id bigint FK → venues.venue_id null
• kickoff_at timestamptz null
• updated_at timestamptz default now()

Indexes:
• idx_fixtures_round on (season, round_id)
• idx_fixtures_home on home_squad_id
• idx_fixtures_away on away_squad_id

Notes:
• Populated from rounds.json raw data during reference sync.
• Enables "fixture strip" queries: SELECT * FROM fixtures WHERE home_squad_id = :id OR away_squad_id = :id AND season = :season ORDER BY round_id
• Replaces the need to parse rounds.raw JSONB at query time.

position_labels (lookup)
• position_id int PK
• label text (e.g. "Fullback", "Wing", "Centre", "Five-Eighth", "Halfback", "Hooker", "Prop", "2nd Row", "Lock")

Notes:
• Small static table. Maps the int values used in players.positions to human-readable labels.
• Seed once from upstream data or manually.

rounds
• round_id int PK
• season int
• round_display text null
• start_at timestamptz null
• end_at timestamptz null
• is_bye_round boolean default false
• is_big_bye_round boolean default false
• raw jsonb (store whole upstream round object)
• updated_at timestamptz default now()

Indexes:
• idx_rounds_season on season

players
• player_id bigint PK (NRL id)
• first_name text
• last_name text
• full_name text (generated or stored)
• squad_id bigint FK → squads.squad_id
• status text (playing / injured / uncertain etc)
• positions int[] (e.g. {2,4} — from upstream "positions" array)
• original_positions int[] null (from upstream — tracks position before transfer)
• original_squad_id bigint null (squad before mid-season transfer)
• transfer_round int null default 0 (round the player was transferred)
• cost int (current price from players feed)
• is_bye boolean default false (from upstream is_bye: 0/1)
• locked boolean default false (from upstream locked: 0/1)
• active boolean default true
• raw jsonb (whole player upstream record)
• updated_at timestamptz default now()

Indexes:
• idx_players_squad on squad_id
• idx_players_name_gin on to_tsvector(‘simple’, full_name) (for fast search)
• idx_players_positions_gin on positions (GIN)

Notes:
• Upstream "positions" is already an int array (e.g. [2], [3], [2,4]). Store directly.
• original_positions / original_squad_id / transfer_round track mid-season transfers.

⸻

2. “Current snapshot” table (what your API reads most)

This is the “fat” current metrics merged from coach endpoint + your derived values.

player_current
• player_id bigint PK FK → players
• season int
• price int
• avg_points numeric(5,2) null      — from players.json stats.avg_points
• high_score int null                — from players.json stats.high_score
• low_score int null                 — from players.json stats.low_score
• last_3_avg numeric(5,2) null       — from players.json stats.last_3_avg
• last_5_avg numeric(5,2) null       — from players.json stats.last_5_avg
• games_played int null              — from players.json stats.games_played
• total_points int null              — from players.json stats.total_points
• season_rank int null               — from players.json stats.season_rank

Time on ground (from both sources)
• tog int null                       — from players.json stats.tog (season avg %)
• total_tog int null                 — from coach endpoint total_tog (total minutes)
• last_3_tog_avg numeric(6,2) null   — from coach endpoint last_3_tog_avg
• last_5_tog_avg numeric(6,2) null   — from coach endpoint last_5_tog_avg

Ownership (from players.json — maps: c→captain, vc→vice_captain, bc→bench, res→reserve)
• owned_by numeric(6,2) null         — stats.owned_by
• selections int null                — stats.selections
• captain_pct numeric(6,2) null      — stats.selections_info.c
• vc_pct numeric(6,2) null           — stats.selections_info.vc
• bench_pct numeric(6,2) null        — stats.selections_info.bc
• res_pct numeric(6,2) null          — stats.selections_info.res
• adp int null                       — stats.adp (average draft position)

Draft ownership (from coach endpoint — separate from classic fantasy)
• draft_owned_by numeric(6,2) null          — coach.draft_owned_by
• draft_owned_by_change numeric(6,2) null   — coach.draft_owned_by_change
• draft_selections int null                 — coach.draft_selections

Projections & rankings (from players.json)
• proj_avg numeric(5,2) null         — stats.proj_avg
• wpr numeric(8,4) null              — stats.wpr (weighted projected rank)
• round_wpr jsonb null               — stats.round_wpr (e.g. {"1": 72.7882})
• career_avg numeric(5,2) null       — stats.career_avg
• last_3_proj_avg numeric(5,2) null  — stats.last_3_proj_avg
• position_ranks jsonb null          — coach.position_ranks (e.g. {"3": 0})

Break evens + projections (from coach endpoint, keyed by round number)
• break_evens jsonb null             — coach.break_evens (e.g. {"1":19,"2":-1})
• be_pct jsonb null                  — coach.be_pct (e.g. {"1":1,"2":1})
• proj_prices jsonb null             — coach.proj_prices (e.g. {"2":277085})
• proj_scores jsonb null             — coach.proj_scores (e.g. {"1":44})

Coach-only stats
• consistency numeric(5,2) null      — coach.consistency
• in_20_avg numeric(5,2) null        — coach.in_20_avg
• out_20_avg numeric(5,2) null       — coach.out_20_avg

Splits (career_avg_vs from players.json is simple squad_id→avg mapping;
        opponents/venues from coach endpoint have richer detail: avg/low/high/games/last_3)
• career_avg_vs jsonb null           — from players.json stats.career_avg_vs
• opponents jsonb null               — from coach endpoint (detailed opponent splits)
• venues jsonb null                  — from coach endpoint (detailed venue splits)

Historical context (from coach endpoint)
• last_season_scores jsonb null      — coach.last_season_scores (e.g. {"27": 69})
• transfers jsonb null               — coach.transfers

Your derived metrics
• ppm_season numeric(8,4) null       — total_points / total_tog
• ppm_last_3 numeric(8,4) null       — last_3_avg / last_3_tog_avg
• ppm_last_5 numeric(8,4) null       — last_5_avg / last_5_tog_avg
• ppm_value numeric(10,4) null       — ppm_season / (price / 100000)
• value_score numeric(10,4) null
• price_delta_3 int null
• price_delta_5 int null
• source_updated_at timestamptz null (from upstream)
• updated_at timestamptz default now()

Indexes:
• idx_player_current_season on season
• idx_player_current_owned_by on owned_by
• idx_player_current_value_score on value_score
• idx_player_current_adp on adp

⸻

3. History / time-series tables

player_round_stats
One row per player per round (plus match context if available later).
• season int
• round_id int FK → rounds
• player_id bigint FK → players
• match_id bigint null
• fantasy_points int null
• time_on_ground int null
• tries int null
• try_assists int null
• tackles int null
• missed_tackles int null
• metres_gained int null
• kick_metres int null
• errors int null
• offloads int null
• raw jsonb null
• updated_at timestamptz default now()

Primary key:
• PK (season, round_id, player_id)

Indexes:
• idx_prs_player on (player_id, season)
• idx_prs_round on (season, round_id)

player_price_history
• season int
• round_id int
• player_id bigint
• price int
• updated_at timestamptz default now()

PK:
• PK (season, round_id, player_id)

Indexes:
• idx_pph_player on (player_id, season)

player_ownership_history (optional but recommended)
• season int
• round_id int
• player_id bigint
• owned_by numeric(6,2)
• selections int
• captain_pct numeric(6,2) null
• vc_pct numeric(6,2) null
• updated_at timestamptz default now()

PK:
• PK (season, round_id, player_id)

⸻

Joins you’ll use (core queries)

Search results (player cards)

players
JOIN squads ON players.squad_id = squads.squad_id
LEFT JOIN player_current ON players.player_id = player_current.player_id AND player_current.season = :season

Team roster

players WHERE squad_id = :id
JOIN player_current (same as above)
ORDER BY value_score / owned_by / price

Player detail page

players + squads + player_current
PLUS history:
• player_round_stats WHERE player_id = :id AND season=:season ORDER BY round_id
• player_price_history same filter
• optionally player_ownership_history

⸻

API endpoints (Express)

Standard error response shape for all endpoints:
{ "error": "Human-readable message", "code": "PLAYER_NOT_FOUND" }

Public endpoints

GET /api/meta
Returns current season, last ingest timestamps, last successful ingest per job.
Use this for monitoring — alert if any job's last_success is older than expected.

GET /api/players/search?q=&squad_id=&position=&status=&sort=&limit=&offset=
Returns paginated list for typeahead + filters.
• q matches players.full_name (tsvector)
• position checks players.positions @> ARRAY[:position]
• join player_current for price/owned/value
• limit defaults to 25, max 100
• offset for pagination
• Response: { data: [...], total: number, limit: number, offset: number }

GET /api/teams
List squads (id, name, abbrev, logo_url).

GET /api/teams/:squad_id
Roster + summary stats
• roster list = joined player cards
• optionally include team averages / total ownership
• includes fixture_strip from fixtures table

GET /api/players/:player_id
Returns:
• player (players + squads + position_labels)
• current (player_current)
• history:
• round_stats[] from player_round_stats
• prices[] from player_price_history
• ownership[] optional
• fixture_strip from fixtures WHERE home_squad_id = squad_id OR away_squad_id = squad_id

GET /api/rankings/value?position=&min_games=&min_minutes=&limit=&offset=
Uses player_current.value_score.
• Paginated (same response shape as search)

Caching strategy:
• Set Cache-Control headers on all Express responses (e.g. max-age=300 for 5-min staleness)
• Redis (if added) sits between Express and DB for hot queries like search + rankings
• Hash upstream API responses in the worker — skip DB writes when data hasn't changed

⸻

Worker ingestion plan (the important part)

This app is a stats/analysis tool, not a live team-list tracker. Users check the official
NRL Fantasy app for active/inactive status. They come here for deeper statistics (PPM,
value scores, splits, break evens) to make better trade/captain decisions. Data freshness
of a few hours is fine — what matters is accuracy after key weekly events (price changes,
round completion).

Ingestion schedule (all times NZDT)

1. Monday 6:00 PM — Post-lockout full sync
   The round has just locked out. This is the primary weekly sync.
   • Job A: Reference sync (squads, rounds, venues, fixtures, players)
   • Job B: Coach sync (all player coach endpoints)
   • Job C: Derive metrics (PPM, value scores, price deltas)
   Why: Captures final ownership %, scores, and updated stats after the round closes.

2. Tuesday 12:00 PM — Price change verification sync
   Prices update after the round. This sync verifies price changes landed.
   • Job A: Reference sync (players.json — confirms new prices)
   • Job B: Coach sync (break evens and projections recalculate off new prices)
   • Job C: Derive metrics (price deltas update with new prices)
   Why: Prices are the main thing that changes mid-week. Users need accurate BEs
   and projections based on the new price to plan trades.

3. Thursday 7:00 PM — Pre-lockout refresh
   Team lists have been announced and most trade activity has happened.
   • Job A: Reference sync (picks up any mid-week data changes)
   • Job B: Coach sync (refreshed projections heading into the round)
   • Job C: Derive metrics
   Why: Users are finalising their teams before lockout. Fresh projections,
   updated ownership trends, and current break evens help last-minute decisions.

4. Manual on-demand script
   A CLI command (e.g. `npm run sync` or `node worker/sync.js`) that runs
   the full sync pipeline (Job A + B + C) immediately.
   • Use for: initial data load, after deploying fixes, investigating data issues,
     or if upstream data looks stale.
   • Accepts optional flags: --players-only, --coach-only, --derive-only

Job A: Reference sync
1. fetch squads.json → upsert into squads
2. fetch rounds.json → upsert into rounds + parse fixtures from raw into fixtures table
3. fetch venues.json → upsert into venues
4. fetch players.json → upsert into players table (core fields) AND into player_current:
   • All stats.* fields: avg_points, high_score, low_score, last_3_avg, last_5_avg,
     games_played, total_points, season_rank, tog, owned_by, selections, selections_info,
     adp, proj_avg, wpr, round_wpr, career_avg, career_avg_vs, last_3_proj_avg
   • Player fields: cost, status, positions, is_bye, locked, original_positions,
     original_squad_id, transfer_round
   Note: players.json is the primary source for most player_current fields.
         The coach endpoint enriches with projections, splits detail, and draft data.

Job B: Coach player sync (this powers BE, projections, splits)
• Load all player_id from players
• For each:
  • fetch /coach/players/{id}.json
  • upsert into player_current fields (coach-only data):
    • break_evens, be_pct, proj_prices, proj_scores
    • venues (detailed: avg/low/high/games/last_3 per venue)
    • opponents (detailed: avg/low/high/games/last_3 per opponent)
    • total_tog, last_3_tog_avg, last_5_tog_avg
    • consistency, in_20_avg, out_20_avg
    • draft_owned_by, draft_owned_by_change, draft_selections
    • position_ranks
    • last_season_scores, transfers
  • also upsert:
    • player_price_history for current round price
    • player_ownership_history snapshot

Critical: don’t slam the endpoint
• Concurrency: 3–8 simultaneous fetches max
• Cache results; skip if unchanged (hash body)
• Backoff on non-200s

Job C: Derive metrics (runs after Job A + B)
• Compute and write to player_current:
  • PPM: total_points / total_tog (and last_3, last_5 variants)
  • value_score
  • ppm_value
  • price_delta_3, price_delta_5 (from player_price_history)

Monitoring:
• Each job writes its last_success timestamp + status to a meta/ingest_log table
• /api/meta exposes these timestamps so you can see data freshness
• If upstream format changes or endpoints go down, worker logs errors but doesn’t crash
• Consider a simple health check endpoint the worker exposes (GET /healthz)

⸻

Derived metrics (your enrichment)

Compute in worker after updating player_current + histories:

Points per minute (PPM) — key differentiator metric
• ppm_season = total_points / total_tog
  Data: total_points from players.json, total_tog from coach endpoint
  Example: Payne Haas — 1548 pts / 55 mins* = need to verify total_tog units
  Note: coach endpoint "tog" field in players.json is a percentage (e.g. 61 = 61%),
  while "total_tog" from coach endpoint appears to be total minutes across the season.
  Verify units before computing. If total_tog = total minutes across all games:
  ppm_season = total_points / total_tog (e.g. 1548 / 1281 = 1.21 PPM)
  If tog = avg minutes per game:
  ppm_season = avg_points / tog (e.g. 73.7 / 61 = 1.21 PPM — same result)

• ppm_last_3 = last_3_avg / last_3_tog_avg
  Data: last_3_avg from players.json, last_3_tog_avg from coach endpoint
  This captures recent form efficiency — a player whose PPM is rising is getting
  more productive per minute, even if their raw score hasn't changed.

• ppm_last_5 = last_5_avg / last_5_tog_avg
  Data: last_5_avg from players.json, last_5_tog_avg from coach endpoint

Why PPM matters:
• Exposes efficient players in limited minutes (interchange forwards, impact bench)
• Filters out "volume scorers" who only score because they play 80 mins
• Combined with price → identifies underpriced efficient players
• PPM trend (season vs last_3) shows whether a player is getting more or less efficient

Price deltas
• price_delta_3 = current_price - price_3_rounds_ago
• price_delta_5 = current_price - price_5_rounds_ago

Value score
• value_score = avg_points / (price / magic_number_est)
• magic_number_est can be global median of price/avg_points for stable players
  (games_played >= 5). Store this once in a meta table or compute on the fly.

PPM value score (alternative ranking that factors in efficiency)
• ppm_value = ppm_season / (price / 100000)
  Normalizes PPM against price. A cheap player with high PPM ranks highest.
  Useful for finding bench/reserve bargains.

⸻

Drizzle ORM (optional, but works well)

Use Drizzle in your Express API and worker for:
• typed schema (shared between API + worker)
• migrations
• query building

Drizzle + Supabase: connect via the Supabase Postgres connection string (use transaction pooler if needed).
/apps
/web (Next.js)
/api (Express)
/worker (Node)
/packages
/db (drizzle schema + migrations)

Example response shapes (so your frontend is easy)
{
"player_id": 504300,
"full_name": "Payne Haas",
"team": { "squad_id": 500011, "name": "Broncos", "logo_url": "..." },
"positions": [2],
"status": "uncertain",
"price": 950000,
"owned_by": 64.42,
"avg_points": 73.7,
"break_even_next": 73,
"value_score": 1.08
}

Player detail
{
"player": {...},
"current": {...},
"history": {
"round_stats": [...],
"price": [...],
"ownership": [...]
},
"splits": {
"opponents": {...},
"venues": {...}
}
}
Build order (fastest path to MVP)
1. ✅ DB schema + migrations (include fixtures + position_labels tables)
2. ✅ Reference sync job (players/squads/rounds/venues/fixtures)
3. ✅ Coach sync job → fills player_current + derive metrics (PPM, value scores)
4. ✅ Express endpoints: /teams, /players/search, /players/:id (with pagination)
   • OpenAPI/Swagger docs at /api-docs
5. ✅ Shared types package (packages/types/) — see shared-types.md
6. Wire up Next.js client — see nextjs-architecture.md
   • Install @nrl/types, add transpilePackages
   • TanStack Query + custom hooks (useTeams, useSearchPlayers, usePlayer)
   • Search page → Team page → Player page
7. Add history tables + charts once in-season stats endpoints are found
8. (Future) Users table + watchlists / price alerts if demand exists

⸻

Related docs
• shared-types.md — @nrl/types package: what's exported, how API and client use it
• nextjs-architecture.md — folder structure, data fetching pattern, TanStack Query setup

⸻

Future considerations:
• Users table — even if the site is free, users may want watchlists, "my team" tracking,
  or price change alerts. Adding a users table later means migrating all endpoints. Consider
  a placeholder now if this is on the roadmap.
• player_current has ~30+ columns mixing ownership, projections, splits, and derived metrics.
  If it gets unwieldy, consider splitting into player_ownership, player_projections, player_splits.
  For MVP the single table is fine, but watch for it becoming a maintenance burden.
