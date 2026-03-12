# NRL Fantasy Intelligence - Client

Next.js 16 client application for NRL Fantasy player intelligence and analysis.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TanStack Query v5 (data fetching & caching)
- Tailwind CSS 4
- TypeScript
- Shared types from `@nrl/types` package

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.local.example .env.local
# Edit .env.local and set NEXT_PUBLIC_API_URL (defaults to http://localhost:3001)
# Optionally set NEXT_PUBLIC_GA_MEASUREMENT_ID for analytics
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx               # Root layout with nav & QueryProvider
│   ├── page.tsx                 # Home page
│   ├── players/
│   │   ├── search/              # Player search with filters
│   │   │   ├── page.tsx
│   │   │   └── components/      # Route-specific components
│   │   └── [player_id]/         # Player detail page
│   │       ├── page.tsx
│   │       └── components/
│   └── teams/
│       ├── page.tsx             # Teams list
│       └── [squad_id]/          # Team detail with roster
│           ├── page.tsx
│           └── components/
├── components/                   # Shared UI components
│   ├── ui/                      # Base UI primitives
│   └── position-badge.tsx       # Reusable components
├── hooks/
│   ├── api/                     # TanStack Query hooks
│   │   ├── keys.ts             # Query key factory
│   │   ├── use-teams.ts
│   │   ├── use-team.ts
│   │   ├── use-search-players.ts
│   │   └── use-player.ts
│   └── use-debounce.ts
├── lib/
│   ├── api-client.ts            # Fetch wrapper
│   ├── constants.ts             # Position labels, sort options
│   └── utils.ts                 # Utility functions
└── providers/
    └── query-provider.tsx       # TanStack Query setup
```

## Features

### Player Search (`/players/search`)

- Text search by player name (debounced)
- Filter by team, position
- Sort by avg points, price, ownership, value score, PPM
- Pagination with URL state (shareable links)
- Results table with key stats

### Team Pages

- Teams list (`/teams`) - browse all NRL teams
- Team detail (`/teams/[squad_id]`) - roster with sortable player cards, fixture strip

### Player Detail (`/players/[player_id]`)

- Player header with price, status, positions
- Stats overview (avg, total, games, rank, last 3/5)
- Ownership card (owned %, captain %, VC %, bench %, ADP)
- Break evens card (next 5 rounds)
- Projections card (projected scores & prices)
- Fixture strip
- Opponent & venue splits tables

## Data Fetching Pattern

All API calls use TanStack Query custom hooks:

```typescript
// Example usage
import { useSearchPlayers } from "@/hooks/api/use-search-players";

const { data, isLoading, error } = useSearchPlayers({
  q: "Haas",
  sort: "value_score",
});
```

Query configuration:

- 5 min stale time (data doesn't change often)
- 30 min garbage collection
- No refetch on window focus
- Automatic caching & deduplication

## Type Safety

All API response types are imported from `@nrl/types`:

```typescript
import type { SearchResponse, PlayerDetailResponse } from "@nrl/types";
```

The types package is transpiled by Next.js via `transpilePackages` config.

## Environment Variables

- `NEXT_PUBLIC_API_URL` - API base URL (default: http://localhost:3001)
- `API_INTERNAL_BASE_URL` - Server-side API base for Next.js server routes (default: `http://localhost:3001` in local)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` - Google Analytics 4 Measurement ID (example: `G-ABCDEFG123`)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Notes

- Search page uses Suspense boundary for `useSearchParams()` (Next.js requirement)
- All pages are client components (`"use client"`) due to TanStack Query
- Route-specific components live in `components/` folders next to their pages
- Shared components only promoted to `src/components/` when used by 2+ routes

## Analytics (GA4)

GA4 is optional and only runs when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set.

Implementation details:

- `gtag.js` is loaded after interactive hydration
- Initial page view is captured by default GA4 config
- Additional page views are sent on App Router route changes

To collect monetization modeling inputs, in GA4 set date range to `Last 30 days` and extract:

- `monthly_users`: Reports -> Acquisition -> Traffic acquisition -> `Total users`
- `monthly_sessions`: Reports -> Acquisition -> Traffic acquisition -> `Sessions`
- `pageviews_per_session`: Reports -> Engagement -> Overview -> `Views per session`
- `avg_engagement_time_seconds`: Reports -> Engagement -> Overview -> `Average engagement time per session`
- `au_traffic_percent`: Reports -> Demographics -> Demographic details -> Country (`AU sessions / total sessions`)
- `nz_traffic_percent`: Reports -> Demographics -> Demographic details -> Country (`NZ sessions / total sessions`)
- `mobile_percent`: Reports -> Tech -> Tech details -> Device category (`Mobile sessions / total sessions`)
- `desktop_percent`: Reports -> Tech -> Tech details -> Device category (`Desktop sessions / total sessions`)
