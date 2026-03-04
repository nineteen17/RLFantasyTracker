import { useQuery } from "@tanstack/react-query";
import type { TeamDetailResponse } from "@nrl/types";
import { apiFetch } from "@/lib/api-client";
import { teamKeys } from "./keys";

export function useTeam(squadId: number) {
  return useQuery({
    queryKey: teamKeys.detail(squadId),
    queryFn: () => apiFetch<TeamDetailResponse>(`/api/teams/${squadId}`),
    enabled: squadId > 0,
  });
}
