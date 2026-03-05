# Next.js Client Architecture

## Stack

- **Next.js 16** (App Router)
- **React 19**
- **TanStack Query** for server state (data fetching, caching, mutations)
- **Tailwind CSS 4** for styling
- **Zod** for runtime response validation (shared via `@nrl/types`)

---

## Folder Structure

```
app/client/src/
  app/                          # Next.js App Router pages
    layout.tsx                  # Root layout (providers, nav)
    page.tsx                    # Home / landing
    players/
      search/
        page.tsx                # Player search page
        components/
          search-filters.tsx
          player-table.tsx
          search-bar.tsx
      [player_id]/
        page.tsx                # Player detail page
        components/
          player-header.tsx
          stats-overview.tsx
          break-evens-card.tsx
          fixture-strip.tsx
          splits-table.tsx
    teams/
      page.tsx                  # Teams list
      [squad_id]/
        page.tsx                # Team detail / roster
        components/
          roster-grid.tsx
          team-header.tsx
          fixture-strip.tsx

  components/                   # Shared / UI components only
    ui/                         # Design primitives
      button.tsx
      card.tsx
      badge.tsx
      skeleton.tsx
      data-table.tsx
      pagination.tsx
    player-card.tsx             # Used across search results, team roster, etc.
    position-badge.tsx          # Shared across multiple routes
    stat-pill.tsx

  hooks/
    api/                        # TanStack Query hooks (centralized)
      use-teams.ts
      use-team.ts
      use-search-players.ts
      use-player.ts
      keys.ts                   # Query key factory
    use-debounce.ts             # Generic utility hooks
    use-media-query.ts

  lib/
    api-client.ts               # Fetch wrapper (base URL, error handling)
    utils.ts                    # cn(), formatPrice(), etc.
    constants.ts                # Position labels, sort options

  providers/
    query-provider.tsx          # TanStack QueryClientProvider
```

### Rules

1. **Route-colocated components**: If a component is used by exactly one route, it lives in that route's `components/` folder.
2. **Promote on reuse**: The moment a component is needed by a second route, move it to `src/components/`.
3. **`src/components/`**: Only UI primitives and components shared across 3+ routes.
4. **Hooks are centralized**: API hooks live in `src/hooks/api/` because they're typically used across routes (search links to player detail, team page links to player detail, etc.).

---

## Data Fetching — TanStack Query + Custom Hooks

### API Client (thin fetch wrapper)

```typescript
// lib/api-client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? "Request failed");
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
```

### Query Key Factory

```typescript
// hooks/api/keys.ts
export const teamKeys = {
  all: ["teams"] as const,
  detail: (squadId: number) => ["teams", squadId] as const,
};

export const playerKeys = {
  search: (filters: Record<string, unknown>) => ["players", "search", filters] as const,
  detail: (playerId: number) => ["players", playerId] as const,
};
```

### Custom Hooks

```typescript
// hooks/api/use-teams.ts
import { useQuery } from "@tanstack/react-query";
import type { TeamsListResponse } from "@nrl/types";
import { apiFetch } from "@/lib/api-client";
import { teamKeys } from "./keys";

export function useTeams() {
  return useQuery({
    queryKey: teamKeys.all,
    queryFn: () => apiFetch<TeamsListResponse>("/api/teams"),
  });
}

// hooks/api/use-team.ts
import type { TeamDetailResponse } from "@nrl/types";

export function useTeam(squadId: number) {
  return useQuery({
    queryKey: teamKeys.detail(squadId),
    queryFn: () => apiFetch<TeamDetailResponse>(`/api/teams/${squadId}`),
    enabled: squadId > 0,
  });
}

// hooks/api/use-search-players.ts
import type { SearchResponse, SearchQuery } from "@nrl/types";

export function useSearchPlayers(filters: Partial<SearchQuery>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }

  return useQuery({
    queryKey: playerKeys.search(filters),
    queryFn: () => apiFetch<SearchResponse>(`/api/players/search?${params}`),
    placeholderData: keepPreviousData,  // smooth pagination transitions
  });
}

// hooks/api/use-player.ts
import type { PlayerDetailResponse } from "@nrl/types";

export function usePlayer(playerId: number) {
  return useQuery({
    queryKey: playerKeys.detail(playerId),
    queryFn: () => apiFetch<PlayerDetailResponse>(`/api/players/${playerId}`),
    enabled: playerId > 0,
  });
}
```

### Usage in Components

```typescript
// app/teams/[squad_id]/page.tsx
"use client";
import { useTeam } from "@/hooks/api/use-team";

export default function TeamPage({ params }: { params: { squad_id: string } }) {
  const { data, isLoading, error } = useTeam(Number(params.squad_id));

  if (isLoading) return <TeamSkeleton />;
  if (error) return <ErrorState message={error.message} />;

  return <RosterGrid roster={data.data.roster} />;
}
```

---

## TanStack Query Configuration

```typescript
// providers/query-provider.tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,       // 5 min — data doesn't change often
        gcTime: 30 * 60 * 1000,          // 30 min garbage collection
        retry: 1,
        refetchOnWindowFocus: false,     // not needed for stats data
      },
    },
  }));

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

Wire into root layout:

```typescript
// app/layout.tsx
import { Suspense } from "react";
import { QueryProvider } from "@/providers/query-provider";
import MobileMenu from "@/components/ui/mobile-menu";
import DesktopNav from "@/components/ui/desktop-nav";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <QueryProvider>
          <Suspense>
            <MobileMenu />
            <DesktopNav />
          </Suspense>
          <main>{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
```

> Nav components use `useSearchParams()`, which requires a `<Suspense>` boundary for Next.js static prerendering.

---

## Additional Recommendations

### Error & Loading States

Create reusable `<ErrorState />` and `<Skeleton />` components in `src/components/ui/`. Every query hook returns `isLoading` / `error` — handle both consistently. Don't let error boundaries swallow useful messages.

### Search with URL State

For the search page, sync filters to URL search params so links are shareable and back/forward works:

```typescript
import { useSearchParams, useRouter } from "next/navigation";

function useSearchFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filters: Partial<SearchQuery> = {
    q: searchParams.get("q") ?? undefined,
    squad_id: searchParams.get("squad_id") ? Number(searchParams.get("squad_id")) : undefined,
    sort: (searchParams.get("sort") as SearchQuery["sort"]) ?? "avg_points",
    offset: Number(searchParams.get("offset") ?? 0),
  };

  const setFilters = (updates: Partial<SearchQuery>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      v !== undefined ? params.set(k, String(v)) : params.delete(k);
    }
    params.set("offset", "0"); // reset pagination on filter change
    router.push(`?${params}`);
  };

  return { filters, setFilters };
}
```

### Prefetching

Prefetch player detail on hover over search results for instant navigation:

```typescript
const queryClient = useQueryClient();

function handleHover(playerId: number) {
  queryClient.prefetchQuery({
    queryKey: playerKeys.detail(playerId),
    queryFn: () => apiFetch<PlayerDetailResponse>(`/api/players/${playerId}`),
    staleTime: 5 * 60 * 1000,
  });
}
```

### Runtime Validation (Optional)

The shared Zod schemas can validate API responses at runtime in development:

```typescript
// lib/api-client.ts — dev-only validation
import { SearchResponseSchema } from "@nrl/types";

if (process.env.NODE_ENV === "development") {
  const parsed = SearchResponseSchema.safeParse(data);
  if (!parsed.success) console.warn("API response mismatch:", parsed.error);
}
```

Don't do this in production — it's a performance cost for catching contract drift during development only.

### Don't Over-Abstract Early

- Start with `apiFetch` + per-resource hooks. Don't build a generic `useApi<T>(path, schema)` factory until you have 6+ hooks that look identical.
- Don't add a state management library (Zustand, Jotai). TanStack Query handles all server state. Local UI state (modals, filters) is just `useState`.
- Don't add React Context for data. If you need to share query data across sibling components, either lift the hook call to the parent or rely on TanStack's built-in cache deduplication (two components calling `usePlayer(123)` share one request).
