# Frontend Setup Prompt

Paste this into a new Claude Code session from the project root (`/Users/nickririnui/Desktop/RLFantasyTracker`):

---

I'm building an NRL Fantasy player intelligence site. The Express API and shared types package are already done. I need to set up the Next.js client at `app/client/`.

## Context files (read these first)
- `plan.md` — full project blueprint: DB schema, API endpoints, response shapes, data sources
- `nextjs-architecture.md` — folder structure, TanStack Query setup, custom hooks pattern, recommendations
- `shared-types.md` — `@nrl/types` package: available schemas/types, how to wire into the client

## What's already done
- Steps 1-5 in `plan.md` are complete (DB, sync worker, API endpoints, shared types)
- `app/client/` exists as a fresh Next.js 16 + React 19 + Tailwind 4 project
- `packages/types/` has all Zod schemas and inferred types ready to import
- API runs on `http://localhost:3001` with these endpoints:
  - `GET /api/teams` — list all squads
  - `GET /api/teams/:squad_id` — team roster + fixture strip
  - `GET /api/players/search?q=&squad_id=&position=&sort=&order=&limit=&offset=` — paginated search
  - `GET /api/players/:player_id` — full player detail + current stats + fixture strip

## What I need you to do (in order)

### Phase 1: Foundation
1. Wire up `@nrl/types` — add `file:` dependency, configure `transpilePackages` in `next.config.ts`, verify types resolve
2. Install TanStack Query (`@tanstack/react-query`)
3. Create `src/lib/api-client.ts` — thin fetch wrapper with base URL from env var and error handling
4. Create `src/providers/query-provider.tsx` — QueryClientProvider with sensible defaults (5min stale, no refetch on focus)
5. Create `src/hooks/api/keys.ts` — query key factory for teams and players
6. Create the four API hooks in `src/hooks/api/`: `use-teams.ts`, `use-team.ts`, `use-search-players.ts`, `use-player.ts`
7. Wire QueryProvider into `app/layout.tsx`

### Phase 2: Search page
8. Build `src/app/players/search/page.tsx` with colocated components:
   - Search bar with debounced text input
   - Filter controls (team dropdown, position filter, sort selector)
   - Results table showing: name, team, position, price, avg points, owned by, value score
   - Pagination controls
   - Sync filters to URL search params so links are shareable

### Phase 3: Team page
9. Build `src/app/teams/page.tsx` — grid/list of all teams
10. Build `src/app/teams/[squad_id]/page.tsx` with colocated components:
    - Team header (name, logo placeholder)
    - Roster grid with sortable player cards
    - Fixture strip

### Phase 4: Player page
11. Build `src/app/players/[player_id]/page.tsx` with colocated components:
    - Player header (name, team, position, status, price)
    - Stats overview card (avg points, total points, games played, season rank)
    - Ownership card (owned by %, captain %, VC %)
    - Break evens display
    - Projected scores/prices
    - Fixture strip
    - Opponent/venue splits tables

## Rules
- Follow the folder structure in `nextjs-architecture.md` exactly — route-colocated components, shared UI in `src/components/ui/`
- Import all response types from `@nrl/types`, never define them locally
- Use TanStack Query for all data fetching, no raw useEffect + fetch
- Keep it simple — no state management library, no over-abstraction
- Use Tailwind for styling
- Do each phase one at a time, verify it works before moving to the next
