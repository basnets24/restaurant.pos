import { ENV } from "@/config/env";

const base = `${ENV.CATALOG_URL}/inventory-items`;

export const InventoryAPI = {
  items: {
    base,
    list: () => base, // GET
    byId: (id: string) => `${base}/${id}`, // GET/PUT/DELETE
  },
} as const;

