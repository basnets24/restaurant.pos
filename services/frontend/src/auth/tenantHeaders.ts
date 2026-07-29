import { getTenant } from "./tenant";

export interface TenantHeaders {
  restaurantId?: string;
  locationId?: string;
}

// Falls back to getTenant() (the tenant store) when no explicit tenant is
// passed, so tenant-scoped calls never silently send no headers at all and
// fall through to http.ts's JWT-decode last resort inference (see CLAUDE.md's
// multi-tenancy section). Single source of truth for every domain module that
// needs to build x-restaurant-id/x-location-id headers - previously
// reimplemented independently (with drifting behavior) in menu, inventory,
// payments, tables, orders, cart, employee, tenant, and restaurantUserProfile.
export function withTenantHeaders(tenant?: TenantHeaders): Record<string, string> {
  const t = tenant ?? getTenant() ?? {};
  const headers: Record<string, string> = {};
  if (t.restaurantId) headers["x-restaurant-id"] = t.restaurantId;
  if (t.locationId) headers["x-location-id"] = t.locationId;
  return headers;
}
