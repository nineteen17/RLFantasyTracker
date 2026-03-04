"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSearchPlayers } from "@/hooks/api/use-search-players";
import type { SearchQuery } from "@nrl/types";
import { SearchBar } from "./components/search-bar";
import { SearchFilters } from "./components/search-filters";
import { PlayerTable } from "./components/player-table";
import { Pagination } from "@/components/ui/pagination";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filters: Partial<SearchQuery> = {
    q: searchParams.get("q") ?? undefined,
    squad_id: searchParams.get("squad_id")
      ? Number(searchParams.get("squad_id"))
      : undefined,
    position: searchParams.get("position")
      ? Number(searchParams.get("position"))
      : undefined,
    status: searchParams.get("status") ?? undefined,
    sort: (searchParams.get("sort") as SearchQuery["sort"]) ?? "avg_points",
    order: (searchParams.get("order") as SearchQuery["order"]) ?? "desc",
    limit: 25,
    offset: Number(searchParams.get("offset") ?? 0),
  };

  const { data, isLoading, error } = useSearchPlayers(filters);

  const updateFilters = (updates: Partial<SearchQuery>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined && v !== "") {
        params.set(k, String(v));
      } else {
        params.delete(k);
      }
    }
    params.set("offset", "0");
    router.push(`?${params.toString()}`);
  };

  const handlePageChange = (newOffset: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("offset", String(newOffset));
    router.push(`?${params.toString()}`);
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
        <>
          <PlayerTable
            players={data.data}
            sort={filters.sort ?? "avg_points"}
            order={filters.order ?? "desc"}
            onSort={updateFilters}
          />
          <Pagination
            total={data.total}
            limit={data.limit}
            offset={data.offset}
            onPageChange={handlePageChange}
          />
        </>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
