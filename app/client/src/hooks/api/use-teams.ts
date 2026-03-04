import { useQuery } from "@tanstack/react-query";
import type { TeamsListResponse } from "@nrl/types";
import { apiFetch } from "@/lib/api-client";
import { teamKeys } from "./keys";

export function useTeams() {
  return useQuery({
    queryKey: teamKeys.all,
    queryFn: () => apiFetch<TeamsListResponse>("/api/teams"),
  });
}
