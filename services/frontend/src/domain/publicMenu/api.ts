import { ENV } from "@/config/env";

const base = `${ENV.CATALOG_URL}/public`;

export const PublicMenuAPI = {
  // The tenant travels as explicit query params, not x-restaurant-id/x-location-id headers:
  // the endpoint is anonymous, and the server rejects a request that omits them rather than
  // falling back to a default tenant.
  menu: (restaurantId: string, locationId: string) =>
    `${base}/menu?restaurantId=${encodeURIComponent(restaurantId)}&locationId=${encodeURIComponent(locationId)}`,
} as const;
