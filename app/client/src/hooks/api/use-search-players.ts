import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { SearchResponse, SearchQuery } from "@nrl/types";
import { apiFetch } from "@/lib/api-client";
import { playerKeys } from "./keys";

interface UseSearchPlayersOptions {
  enabled?: boolean;
}

export function useSearchPlayers(
  filters: Partial<SearchQuery>,
  options: UseSearchPlayersOptions = {},
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === "") continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      params.set(k, v.join(","));
      continue;
    }
    params.set(k, String(v));
  }

  return useQuery({
    queryKey: playerKeys.search(filters),
    queryFn: () =>
      apiFetch<SearchResponse>(`/api/players/search?${params.toString()}`),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}
