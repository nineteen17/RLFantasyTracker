import { useQuery } from "@tanstack/react-query";
import type { PlayedWithResponse } from "@nrl/types";
import { apiFetch } from "@/lib/api-client";
import { playerKeys } from "./keys";

export function usePlayedWith(playerId: number) {
  return useQuery({
    queryKey: playerKeys.playedWith(playerId),
    queryFn: () =>
      apiFetch<PlayedWithResponse>(`/api/players/${playerId}/played-with`),
    enabled: playerId > 0,
  });
}
