"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SearchQuery, SearchResponse } from "@nrl/types";
import { useSearchPlayers } from "@/hooks/api/use-search-players";
import { trackEvent } from "@/lib/analytics";
import { Pagination } from "@/components/ui/pagination";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchBar } from "./components/search-bar";
import { SearchFilters } from "./components/search-filters";
import { PlayerTable } from "./components/player-table";
import {
  areSearchFiltersEqual,
  buildSearchParams,
  parseSearchFilters,
  type PlayerSearchFilters,
} from "./search-query";

interface PlayerSearchPageClientProps {
  initialFilters: PlayerSearchFilters;
  initialData?: SearchResponse | null;
}

export default function PlayerSearchPageClient({
  initialFilters,
  initialData,
}: PlayerSearchPageClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const filters = useMemo(
    () => parseSearchFilters((key) => searchParams.get(key)),
    [searchParams],
  );

  const shouldHydrateFromInitialData = useMemo(
    () => Boolean(initialData) && areSearchFiltersEqual(filters, initialFilters),
    [filters, initialData, initialFilters],
  );

  const { data, isLoading, error } = useSearchPlayers(filters, {
    initialData: shouldHydrateFromInitialData ? initialData ?? undefined : undefined,
  });

  const updateFilters = (updates: Partial<SearchQuery>) => {
    const nextFilters: PlayerSearchFilters = {
      ...filters,
      ...updates,
      offset: 0,
    };

    trackEvent("search_used", {
      search_query: nextFilters.q ?? "",
      squad_filter: nextFilters.squad_id ?? "",
      position_filter: nextFilters.position ?? "",
    });

    const query = buildSearchParams(nextFilters).toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const handlePageChange = (newOffset: number) => {
    const nextFilters: PlayerSearchFilters = {
      ...filters,
      offset: Math.max(0, newOffset),
    };

    const query = buildSearchParams(nextFilters).toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Player Search</h1>
        <p className="mt-2 text-muted">Search and filter NRL Fantasy players</p>
      </div>

      <div>
        <SearchBar
          value={filters.q ?? ""}
          onChange={(q) => updateFilters({ q })}
        />
        <div className="mt-3">
          <SearchFilters
            squadId={filters.squad_id}
            position={filters.position}
            status={filters.status}
            onFilterChange={updateFilters}
          />
        </div>
      </div>

      {error && <ErrorState message={error.message} />}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : data ? (
        <div>
          <PlayerTable
            players={data.data}
            sort={filters.sort}
            order={filters.order}
            onSort={updateFilters}
          />
          <Pagination
            total={data.total}
            limit={data.limit}
            offset={data.offset}
            onPageChange={handlePageChange}
          />
        </div>
      ) : null}

      <Link
        href="/players"
        className="inline-flex text-sm text-muted transition-colors hover:text-accent-light hover:underline"
      >
        Browse A-Z player index
      </Link>
    </div>
  );
}
