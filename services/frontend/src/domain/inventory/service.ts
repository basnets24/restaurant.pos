import { http } from "@/lib/http";
import { InventoryAPI } from "./api";
import { getApiToken } from "@/auth/getApiToken";
import { tenantAccessor } from "@/auth/runtime";
import type { InventoryItemDto, UpdateInventoryItemDto } from "./types";

// See domain/menu/service.ts for why this is explicit rather than relying on
// http.ts's interceptor-based tenant header inference.
function withTenantHeaders(): Record<string, string> {
  const t = tenantAccessor() ?? {};
  const headers: Record<string, string> = {};
  if (t.restaurantId) headers["x-restaurant-id"] = String(t.restaurantId);
  if (t.locationId) headers["x-location-id"] = String(t.locationId);
  return headers;
}

export const InventoryItems = {
  list: async (): Promise<InventoryItemDto[]> => {
    const token = await getApiToken("Catalog", ["catalog.inventory.read"]);
    const { data } = await http.get(InventoryAPI.items.list(), { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
    return data;
  },
  get: async (id: string): Promise<InventoryItemDto> => {
    const token = await getApiToken("Catalog", ["catalog.inventory.read"]);
    const { data } = await http.get(InventoryAPI.items.byId(id), { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
    return data;
  },
  // update accepts partials; Note: server treats Quantity as DELTA
  update: async (id: string, dto: UpdateInventoryItemDto): Promise<void> => {
    const token = await getApiToken("Catalog", ["catalog.inventory.write"]);
    await http.put(InventoryAPI.items.byId(id), dto, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
  },
  remove: async (id: string): Promise<void> => {
    const token = await getApiToken("Catalog", ["catalog.inventory.write"]);
    await http.delete(InventoryAPI.items.byId(id), { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
  },
  // Helpers
  setQuantity: async (id: string, qty: number) => {
    const item = await InventoryItems.get(id);
    const current = Math.max(0, item.quantity ?? 0);
    const desired = Math.max(0, qty);
    const delta = desired - current;
    if (delta === 0) return;
    const token = await getApiToken("Catalog", ["catalog.inventory.write"]);
    await http.put(InventoryAPI.items.byId(id), { quantity: delta }, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
  },
  adjustQuantity: async (id: string, delta: number) => {
    if (!Number.isFinite(delta) || delta === 0) return;
    const token = await getApiToken("Catalog", ["catalog.inventory.write"]);
    await http.put(InventoryAPI.items.byId(id), { quantity: delta }, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
  },
  setAvailability: async (id: string, value: boolean) => {
    const token = await getApiToken("Catalog", ["catalog.inventory.write"]);
    await http.put(InventoryAPI.items.byId(id), { isAvailable: value }, { headers: { ...withTenantHeaders(), Authorization: `Bearer ${token}` } });
  },
};
