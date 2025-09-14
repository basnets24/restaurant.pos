export const InventoryKeys = {
  items: ["inventory", "items"] as const,
  item: (id: string) => ["inventory", "item", id] as const,
};

