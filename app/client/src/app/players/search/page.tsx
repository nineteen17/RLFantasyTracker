import type { SearchResponse } from "@nrl/types";
import { apiFetchServer } from "@/lib/api-server";
import PlayerSearchPageClient from "./player-search-page-client";
import { buildSearchParams, parseSearchFilters } from "./search-query";

type SearchPageSearchParams = Record<string, string | string[] | undefined>;

export const revalidate = 120;

async function fetchSearchData(
  searchParams: SearchPageSearchParams,
): Promise<{ filters: ReturnType<typeof parseSearchFilters>; data?: SearchResponse }> {
  const filters = parseSearchFilters((key) => searchParams[key]);
  const params = buildSearchParams(filters);
  const query = params.toString();
  const path = query ? `/api/players/search?${query}` : "/api/players/search";

  try {
    const data = await apiFetchServer<SearchResponse>(path, { next: { revalidate } });
    return { filters, data };
  } catch {
    return { filters };
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchPageSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const { filters, data } = await fetchSearchData(resolvedSearchParams);

  return <PlayerSearchPageClient initialFilters={filters} initialData={data} />;
}
