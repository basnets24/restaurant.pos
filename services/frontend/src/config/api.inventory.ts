import { ENV } from "./env";

const base = `${ENV.INVENTORY_URL}/inventory-items`;

export const InventoryAPI = {
    items: {
        base,
        list: () => base,                 // GET
        byId: (id: string) => `${base}/${id}`, // GET/PUT/DELETE
    },
} as const;