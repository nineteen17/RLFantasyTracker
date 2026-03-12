import { useQuery } from "@tanstack/react-query";
import type { TeamsListResponse, ByePlannerResponse } from "@nrl/types";
import { apiFetch } from "@/lib/api-client";
import { teamKeys } from "./keys";

interface UseTeamsOptions {
  initialData?: TeamsListResponse;
}

export function useTeams(options: UseTeamsOptions = {}) {
  return useQuery({
    queryKey: teamKeys.all,
    queryFn: () => apiFetch<TeamsListResponse>("/api/teams"),
    initialData: options.initialData,
  });
}

export function useTeamByes() {
  return useQuery({
    queryKey: teamKeys.byes,
    queryFn: () => apiFetch<ByePlannerResponse>("/api/teams/byes"),
  });
}
