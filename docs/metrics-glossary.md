# Metrics Glossary

All data sourced from the NRL Fantasy API unless stated otherwise.

---

## Player Stats (from NRL API)

| Metric | Source | Description |
|--------|--------|-------------|
| **Avg Points** | NRL API | Average fantasy points per game this season |
| **Total Points** | NRL API | Sum of all fantasy points scored this season |
| **Games Played** | NRL API | Number of games played this season |
| **Season Rank** | NRL API | Player's rank among all players by total points |
| **Last 3 Avg** | NRL API | Average fantasy points over the last 3 games |
| **Last 5 Avg** | NRL API | Average fantasy points over the last 5 games |
| **High Score** | NRL API | Highest single-game fantasy score this season |
| **Low Score** | NRL API | Lowest single-game fantasy score this season |
| **Career Avg** | NRL API | Lifetime average fantasy points per game |

---

## Pricing & Value

| Metric | Source | Description |
|--------|--------|-------------|
| **Price** | NRL API | Current salary cap cost. Updated weekly based on performance |
| **Projected Avg** | NRL API | NRL's projected average for the player. At season start this is essentially the 2025 season average. For players with very few games in 2025, it leans on career average instead |

### How NRL prices players (observed, not official)

The NRL Fantasy pricing algorithm is not public. Based on data analysis:

- Starting prices correlate strongly with `projAvg * ~$12,724`, rounded to the nearest $1,000
- This holds for ~98% of players (323/328 within $1k)
- A handful of high-profile players (e.g. Cleary, Haas) are priced higher than this formula predicts — likely manual adjustments or a premium factor we can't see
- There is a **$250,000 price floor** for established players. True rookies (0 career games) are priced at **$230,000**
- Players with very few 2025 games (e.g. injury) appear to be priced off career average rather than last season average

**We do not use this formula anywhere in the app.** It's documented here for reference only. The app displays NRL's own `projAvg` and `careerAvg` values directly — no price reverse-engineering involved.

Prices update weekly during the season based on recent performance vs break-even score.

---

## Break Evens

| Metric | Source | Description |
|--------|--------|-------------|
| **Break Even** | NRL API (coach endpoint) | The fantasy score a player needs in the next round to maintain their current price. Score above = price rises. Score below = price drops |
| **BE %** | NRL API (coach endpoint) | Percentage likelihood of the player hitting their break-even score, based on historical performance |

Break-even data is provided per round for the next 3 rounds. The player detail page shows the next round's BE and BE% in the Stats Overview, and all 3 rounds in the Price Predictor table.

---

## Price Predictor

| Field | Source | Description |
|-------|--------|-------------|
| **Projected Scores** | NRL API (coach endpoint) | `proj_scores` — NRL's projected fantasy score per round for the next 3 rounds |
| **Projected Prices** | NRL API (coach endpoint) | `proj_prices` — NRL's projected price after each of the next 3 rounds |
| **Break Evens** | NRL API (coach endpoint) | `break_evens` — score needed to maintain price per round |

### How the Price Predictor works

The NRL API provides baseline projections: for each of the next 3 rounds, it gives a projected score and the resulting projected price. From this we derive a **price-per-point rate** for each round:

```
price_change = proj_prices[round+1] - previous_price
score_diff   = proj_scores[round] - break_evens[round]
price_per_point = price_change / score_diff
```

When the user enters a custom score, we recalculate:

```
custom_change = (user_score - break_even) * price_per_point
new_price     = previous_price + custom_change
```

Each round's new price becomes the base for the next round's calculation. A **$230,000 floor** is enforced (no price goes below minimum).

**Limitations:** The break-evens for rounds 2-3 technically shift when round 1's score changes. Since the API provides break-evens assuming NRL's projected scores, our predictor uses those fixed break-evens. For scores close to the projection this is accurate; for extreme deviations the later rounds may drift slightly. After each round completes and a fresh sync runs, the break-evens update with actual results.

---

## Ownership

| Metric | Source | Description |
|--------|--------|-------------|
| **Owned By** | NRL API | Percentage of all salary cap teams that have selected this player |
| **Selections** | NRL API | Total number of teams that have this player |
| **Captain %** | NRL API | Percentage of teams that have this player as captain |
| **Vice Captain %** | NRL API | Percentage of teams that have this player as vice captain |
| **Bench %** | NRL API | Percentage of owners who have this player on the bench |
| **Avg Draft Position** | NRL API | Average position this player is picked in draft leagues. Lower = picked earlier = more valued in draft format |

---

## Derived Metrics (ours)

These are the only metrics we calculate ourselves. Everything else comes directly from the NRL API.

| Metric | Formula | Description |
|--------|---------|-------------|
| **PPM (Points Per Minute)** | `avgPoints / timeOnGround` | Scoring efficiency per minute played. A bench player averaging 35 pts in 50 mins may be more efficient than a starter averaging 50 pts in 80 mins |
| **Base Avg** | See below | Average fantasy points per game from base stats only (TCK, MG, KM, G). Represents the reliable weekly floor |
| **Position Rank** | See below | Player's rank within their position group, sorted by average points. A Hooker ranked #3 means two other Hookers have a higher average this season |

### Base Avg — how it works

Base Avg measures the portion of a player's fantasy score that comes from **predictable, workload-driven stats** — things that happen every game as long as the player is on the field.

**Base stats (the "floor"):**
- **Tackles (TCK)** — +1 per tackle. Forwards rack up 30-50 per game
- **Metres Gained (MG)** — +1 per 10 metres. Universal workload indicator
- **Kick Metres (KM)** — +1 per 30 metres. Halves, hookers, fullbacks
- **Goals (G)** — +2 per goal. If they're the team's kicker, near-guaranteed points

**Calculation:** During sync, we fetch per-round stats from the upstream API for all completed/active rounds. For each player, we sum the fantasy points generated by base stats only, then divide by games played.

**Why it matters:** Two players can average 50 points but have very different floors:
- Player A: 35 base avg → 35 reliable points + 15 from variable events (safe pick)
- Player B: 18 base avg → 18 reliable points + 32 from tries/line breaks (boom/bust)

Base Avg is shown on the player search table and team roster cards alongside the overall average.

### Score Breakdown — the full picture

The Score Breakdown card on the player detail page groups all 22 scoring stats into 5 reliability tiers:

| Category | Stats | What it tells you |
|----------|-------|-------------------|
| **Base** | TCK, MG, KM, G | Bankable floor every week |
| **Secondary** | OFH, OFG, TB | Consistent for certain play styles (e.g. props who offload) |
| **Attacking** | T, TA, LB, LBA | High value but variable week to week |
| **Rare** | TO, TS, FDO, FTF, EFIG, KD, FG | Bonus events, can't plan around them |
| **Negative** | MT, ER, PC, SAI, SB, SO | Risk and discipline cost |

Each category shows average points per game and percentage of total. Click to expand and see individual stat breakdowns within each category (avg count, avg fantasy points, season total).

### Position Rank — how it works

During sync, all players are grouped by their position(s) and sorted by average points (descending). Each player is assigned a rank within each position they belong to. A player with multiple positions (e.g. Centre + Wing/Fullback) will have a rank in each.

The player detail page shows the rank for their primary (first) position. Position groups are:

| ID | Position |
|----|----------|
| 1 | Hooker |
| 2 | Middle Forward |
| 3 | Edge Forward |
| 4 | Half |
| 5 | Centre |
| 6 | Wing / Fullback |

---

## Fantasy Points Scoring (2026 Season)

Source: https://fantasy.nrl.com/help/guidelines (section 8.3)

| Stat | Abbr | Points |
|------|------|--------|
| Try | T | +8 |
| Try Assist | TA | +5 |
| Goal | G | +2 |
| Field Goal | FG | +5 |
| Line Break | LB | +4 |
| Line Break Assist | LBA | +2 |
| Tackle Break | TB | +2 |
| Tackle | TCK | +1 |
| Missed Tackle | MT | -2 |
| Offload (to hand) | OFH | +4 |
| Offload (to ground) | OFG | +2 |
| Metres Gained | MG | +1 per 10m |
| Kick Metres | KM | +1 per 30m |
| Kicks Defused | KD | +1 |
| Forced Drop-out | FDO | +2 |
| Turnover Won | TO | +4 |
| Try Save | TS | +5 |
| 40/20 or 20/40 | FTF | +4 |
| Escape In Goal | EFIG | +2 |
| Error | ER | -2 |
| Penalty Conceded | PC | -2 |
| 6-Again Infringement | SAI | -1 |
| Sin Bin | SB | -5 |
| Send Off | SO | -10 |

---

## Splits

| Metric | Source | Description |
|--------|--------|-------------|
| **Opponent Splits** | NRL API (coach endpoint) | Player's average fantasy score against each NRL team. Helps identify favourable/unfavourable matchups |
| **Venue Splits** | NRL API (coach endpoint) | Player's average fantasy score at each ground. Some players perform notably better at home or specific venues |
