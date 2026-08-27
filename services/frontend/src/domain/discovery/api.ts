import { ENV } from "@/config/env";
import type { DiscoveryQuery } from "./types";

// Discovery is served by the identity service - it owns Restaurant/Location.
const base = `${ENV.IDENTITY_URL}/public`;

export const DiscoveryAPI = {
  list: (q?: DiscoveryQuery) => {
    const p = new URLSearchParams();
    if (q?.q) p.set("q", q.q);
    if (q?.cuisine) p.set("cuisine", q.cuisine);
    if (q?.sort) p.set("sort", q.sort);
    const qs = p.toString();
    return `${base}/restaurants${qs ? `?${qs}` : ""}`;
  },
  byId: (restaurantId: string, locationId: string) =>
    `${base}/restaurants/${encodeURIComponent(restaurantId)}/locations/${encodeURIComponent(locationId)}`,
  cuisines: `${base}/cuisines`,
} as const;
