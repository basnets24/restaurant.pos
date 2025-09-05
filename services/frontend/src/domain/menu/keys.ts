export const MenuKeys = {
  categories: ["menu", "categories"] as const,
  list: (params: unknown) => ["menu", "list", params] as const,
  item: (id: string) => ["menu", "item", id] as const,
};

