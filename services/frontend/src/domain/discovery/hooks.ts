import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Discovery } from "./service";
import { DiscoveryKeys } from "./keys";
import type { DiscoveryListingDto, DiscoveryQuery } from "./types";

export function useDiscoveryListings(q: DiscoveryQuery) {
  return useQuery<DiscoveryListingDto[]>({
    queryKey: DiscoveryKeys.list(q),
    queryFn: () => Discovery.list(q),
    // Keeps the grid populated while a search/filter change is in flight, so the
    // page doesn't flash an empty state on every keystroke.
    placeholderData: keepPreviousData,
  });
}

export function useDiscoveryListing(restaurantId: string, locationId: string) {
  return useQuery<DiscoveryListingDto>({
    queryKey: DiscoveryKeys.listing(restaurantId, locationId),
    queryFn: () => Discovery.byId(restaurantId, locationId),
    enabled: Boolean(restaurantId && locationId),
  });
}

export function useCuisines() {
  return useQuery<string[]>({
    queryKey: DiscoveryKeys.cuisines,
    queryFn: Discovery.cuisines,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
