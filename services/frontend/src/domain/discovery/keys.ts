import type { DiscoveryQuery } from "./types";

export const DiscoveryKeys = {
  all: ["discovery"] as const,
  list: (q: DiscoveryQuery) => ["discovery", "list", q] as const,
  listing: (restaurantId: string, locationId: string) =>
    ["discovery", "listing", restaurantId, locationId] as const,
  cuisines: ["discovery", "cuisines"] as const,
};
