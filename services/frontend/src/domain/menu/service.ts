import { http } from "@/lib/http";
import { getApiToken } from "@/auth/getApiToken";
import { tenantAccessor } from "@/auth/runtime";
import { MenuAPI } from "./api";
import type { MenuItemDto, CreateMenuItemDto, UpdateMenuItemDto, PageResult } from "./types";

// Explicit tenant headers, sourced from the auth profile (tenantAccessor) rather
// than relying on http.ts's interceptor, which infers them from a *different*
// (default, unscoped) token than the one actually used for this call's
// Authorization header - unreliable, and was silently falling back to
// TenantMiddleware's hardcoded defaults instead of the real tenant.
function withTenantHeaders(): Record<string, string> {
  const t = tenantAccessor() ?? {};
  const headers: Record<string, string> = {};
  if (t.restaurantId) headers["x-restaurant-id"] = String(t.restaurantId);
  if (t.locationId) headers["x-location-id"] = String(t.locationId);
  return headers;
}

export const MenuItems = {
  list: async (
    q?: Parameters<typeof MenuAPI.list>[0]
  ): Promise<PageResult<MenuItemDto>> => {
    const token = await getApiToken("Catalog", ["menu.read"]);
    const { data } = await http.get(MenuAPI.list(q), { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
    if (Array.isArray(data)) {
      const items = data as MenuItemDto[];
      return { items, page: 1, pageSize: items.length, total: items.length };
    }
    return data as PageResult<MenuItemDto>;
  },
  categories: async (): Promise<string[]> => {
    const token = await getApiToken("Catalog", ["menu.read"]);
    const { data } = await http.get(MenuAPI.categories, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
    return data;
  },
  create: async (dto: CreateMenuItemDto): Promise<MenuItemDto> => {
    const token = await getApiToken("Catalog", ["menu.write"]);
    const { data } = await http.post(MenuAPI.create, dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
    return data;
  },
  patch: async (id: string, dto: UpdateMenuItemDto): Promise<void> => {
    const token = await getApiToken("Catalog", ["menu.write"]);
    await http.patch(MenuAPI.patch(id), dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
  },
  remove: async (id: string): Promise<void> => {
    const token = await getApiToken("Catalog", ["menu.write"]);
    await http.delete(MenuAPI.remove(id), { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
  },
  setAvailability: async (id: string, value: boolean): Promise<void> => {
    const token = await getApiToken("Catalog", ["menu.write"]);
    await http.post(MenuAPI.availability(id), value, {
      headers: { "Content-Type": "application/json", ...withTenantHeaders(), Authorization: `Bearer ${token}` },
    });
  },
};
