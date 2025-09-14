import { http } from "@/lib/http";
import { InventoryAPI } from "./api";
import { getApiToken } from "@/auth/getApiToken";
import type { InventoryItemDto, UpdateInventoryItemDto } from "./types";

export const InventoryItems = {
  list: async (): Promise<InventoryItemDto[]> => {
    const token = await getApiToken("Inventory", ["inventory.read"]);
    const { data } = await http.get(InventoryAPI.items.list(), { headers: { Authorization: `Bearer ${token}` } });
    return data;
  },
  get: async (id: string): Promise<InventoryItemDto> => {
    const token = await getApiToken("Inventory", ["inventory.read"]);
    const { data } = await http.get(InventoryAPI.items.byId(id), { headers: { Authorization: `Bearer ${token}` } });
    return data;
  },
  // update accepts partials; Note: server treats Quantity as DELTA
  update: async (id: string, dto: UpdateInventoryItemDto): Promise<void> => {
    const token = await getApiToken("Inventory", ["inventory.write"]);
    await http.put(InventoryAPI.items.byId(id), dto, { headers: { Authorization: `Bearer ${token}` } });
  },
  remove: async (id: string): Promise<void> => {
    const token = await getApiToken("Inventory", ["inventory.write"]);
    await http.delete(InventoryAPI.items.byId(id), { headers: { Authorization: `Bearer ${token}` } });
  },
  // Helpers
  setQuantity: async (id: string, qty: number) => {
    const item = await InventoryItems.get(id);
    const current = Math.max(0, item.quantity ?? 0);
    const desired = Math.max(0, qty);
    const delta = desired - current;
    if (delta === 0) return;
    const token = await getApiToken("Inventory", ["inventory.write"]);
    await http.put(InventoryAPI.items.byId(id), { quantity: delta }, { headers: { Authorization: `Bearer ${token}` } });
  },
  adjustQuantity: async (id: string, delta: number) => {
    if (!Number.isFinite(delta) || delta === 0) return;
    const token = await getApiToken("Inventory", ["inventory.write"]);
    await http.put(InventoryAPI.items.byId(id), { quantity: delta }, { headers: { Authorization: `Bearer ${token}` } });
  },
  setAvailability: async (id: string, value: boolean) => {
    const token = await getApiToken("Inventory", ["inventory.write"]);
    await http.put(InventoryAPI.items.byId(id), { isAvailable: value }, { headers: { Authorization: `Bearer ${token}` } });
  },
};
