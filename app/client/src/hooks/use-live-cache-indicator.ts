"use client";

import { useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { LiveRoundResponse, LiveRoundsListResponse } from "@nrl/types";
import { liveKeys } from "@/hooks/api/keys";

function hasPlayingMatchInRounds(data?: LiveRoundsListResponse): boolean {
  return data?.activeRound?.matches.some((match) => match.status === "playing") ?? false;
}

function hasPlayingMatchInRound(data?: LiveRoundResponse): boolean {
  return data?.matches?.some((match) => match.status === "playing") ?? false;
}

export function useLiveCacheIndicator(): boolean {
  const queryClient = useQueryClient();
  const queryCache = queryClient.getQueryCache();

  return useSyncExternalStore(
    (onStoreChange) => queryCache.subscribe(() => onStoreChange()),
    () => {
      const roundsData = queryClient.getQueryData<LiveRoundsListResponse>(liveKeys.rounds);
      if (hasPlayingMatchInRounds(roundsData)) return true;

      const roundQueries = queryClient.getQueriesData<LiveRoundResponse>({
        queryKey: ["live", "round"],
      });

      return roundQueries.some(([, roundData]) => hasPlayingMatchInRound(roundData));
    },
    () => false,
  );
}
