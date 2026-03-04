import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { venueKeys } from "./keys";

interface Venue {
  venueId: number;
  name: string;
  shortName: string | null;
}

export function useVenues() {
  return useQuery({
    queryKey: venueKeys.all,
    queryFn: () => apiFetch<{ data: Venue[] }>("/api/venues"),
  });
}
