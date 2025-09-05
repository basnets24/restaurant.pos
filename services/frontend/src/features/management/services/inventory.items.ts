// src/services/inventory.items.ts
import { http } from "@/lib/http";
import { InventoryAPI } from "@/config/api.inventory";

// --- DTOs mirrored from backend ---
export interface InventoryItemDto {
    id: string;
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    isAvailable: boolean;
    acquiredDate: string; // ISO
}

export interface UpdateInventoryItemDto {
    quantity?: number;     // >= 0
    isAvailable?: boolean; // optional toggle
}

export const InventoryItems = {
    list: async (): Promise<InventoryItemDto[]> => {
        const { data } = await http.get(InventoryAPI.items.list());
        return data;
    },
    get: async (id: string): Promise<InventoryItemDto> => {
        const { data } = await http.get(InventoryAPI.items.byId(id));
        return data;
    },
    update: async (id: string, dto: UpdateInventoryItemDto): Promise<void> => {
        await http.put(InventoryAPI.items.byId(id), dto);
    },
    remove: async (id: string): Promise<void> => {
        await http.delete(InventoryAPI.items.byId(id));
    },
    // Helpers
    setQuantity: async (id: string, qty: number) => {
        await http.put(InventoryAPI.items.byId(id), { quantity: Math.max(0, qty) });
    },
    adjustQuantity: async (id: string, delta: number) => {
        const item = await InventoryItems.get(id);
        const next = Math.max(0, (item.quantity ?? 0) + delta);
        await InventoryItems.setQuantity(id, next);
    },
    setAvailability: async (id: string, value: boolean) => {
        await http.put(InventoryAPI.items.byId(id), { isAvailable: value });
    },
};
