export const PublicMenuKeys = {
  all: ["publicMenu"] as const,
  menu: (restaurantId: string, locationId: string) =>
    ["publicMenu", restaurantId, locationId] as const,
};
