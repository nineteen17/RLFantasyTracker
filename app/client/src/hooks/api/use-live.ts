import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type {
  LiveRoundsListResponse,
  LiveRoundResponse,
  LiveStatsResponse,
  PlayerMatchRawStats,
} from "@nrl/types";
import { apiFetch } from "@/lib/api-client";
import { liveKeys } from "./keys";

/** Fetch all rounds summary + active round detail */
export function useLiveRounds() {
  return useQuery({
    queryKey: liveKeys.rounds,
    queryFn: () => apiFetch<LiveRoundsListResponse>("/api/live"),
    refetchInterval: (query) => {
      const active = query.state.data?.activeRound;
      return active?.status === "active" ? 30_000 : false;
    },
    staleTime: 15_000,
  });
}

/** Fetch a specific round's matches */
export function useLiveRound(roundId: number | null) {
  return useQuery({
    queryKey: liveKeys.round(roundId ?? 0),
    queryFn: () => apiFetch<LiveRoundResponse>(`/api/live/round/${roundId}`),
    enabled: roundId !== null && roundId > 0,
    placeholderData: keepPreviousData,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "active" ? 30_000 : false;
    },
    staleTime: 15_000,
  });
}

/** Fetch player stats for a round (all matches in the round) */
export function useLiveRoundStats(roundId: number | null, isLive: boolean) {
  return useQuery({
    queryKey: liveKeys.roundStats(roundId ?? 0),
    queryFn: () => apiFetch<LiveStatsResponse>(`/api/live/stats/${roundId}`),
    enabled: roundId !== null && roundId > 0,
    refetchInterval: isLive ? 30_000 : false,
    staleTime: 15_000,
  });
}

interface PlayerRoundStat {
  roundId: number;
  stats: PlayerMatchRawStats;
  points: number;
}

interface PlayerStatsResponse {
  playerId: number;
  rounds: PlayerRoundStat[];
}

/** Fetch a player's detailed stats across all rounds */
export function usePlayerStats(playerId: number) {
  return useQuery({
    queryKey: liveKeys.playerStats(playerId),
    queryFn: () => apiFetch<PlayerStatsResponse>(`/api/live/player/${playerId}`),
    staleTime: 60_000,
  });
}
