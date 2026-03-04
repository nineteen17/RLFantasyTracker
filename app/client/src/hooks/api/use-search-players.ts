import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { SearchResponse, SearchQuery } from "@nrl/types";
import { apiFetch } from "@/lib/api-client";
import { playerKeys } from "./keys";

export function useSearchPlayers(filters: Partial<SearchQuery>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }

  return useQuery({
    queryKey: playerKeys.search(filters),
    queryFn: () =>
      apiFetch<SearchResponse>(`/api/players/search?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
}
