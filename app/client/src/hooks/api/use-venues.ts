import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { venueKeys } from "./keys";

interface Venue {
  venueId: number;
  name: string;
  shortName: string | null;
}

export interface VenuesResponse {
  data: Venue[];
}

interface UseVenuesOptions {
  initialData?: VenuesResponse;
}

export function useVenues(options: UseVenuesOptions = {}) {
  return useQuery({
    queryKey: venueKeys.all,
    queryFn: () => apiFetch<VenuesResponse>("/api/venues"),
    initialData: options.initialData,
  });
}
