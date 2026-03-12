import { useQuery } from "@tanstack/react-query";
import type { PlayerDetailResponse, PlayerHistoryResponse } from "@nrl/types";
import { apiFetch } from "@/lib/api-client";
import { playerKeys } from "./keys";

interface UsePlayerOptions {
  initialData?: PlayerDetailResponse;
}

interface UsePlayerHistoryOptions {
  initialData?: PlayerHistoryResponse;
}

export function usePlayer(playerId: number, options: UsePlayerOptions = {}) {
  return useQuery({
    queryKey: playerKeys.detail(playerId),
    queryFn: () => apiFetch<PlayerDetailResponse>(`/api/players/${playerId}`),
    enabled: playerId > 0,
    initialData: options.initialData,
  });
}

export function usePlayerHistory(
  playerId: number,
  includePreseason = false,
  options: UsePlayerHistoryOptions = {},
) {
  return useQuery({
    queryKey: playerKeys.history(playerId, includePreseason),
    queryFn: () =>
      apiFetch<PlayerHistoryResponse>(
        `/api/players/${playerId}/history?includePreseason=${includePreseason}`,
      ),
    enabled: playerId > 0,
    staleTime: 60_000,
    initialData: options.initialData,
  });
}
