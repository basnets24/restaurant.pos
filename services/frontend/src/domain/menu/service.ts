import { http } from "@/lib/http";
import { getApiToken } from "@/auth/getApiToken";
import { MenuAPI } from "./api";
import type { MenuItemDto, CreateMenuItemDto, UpdateMenuItemDto, PageResult } from "./types";

export const MenuItems = {
  list: async (
    q?: Parameters<typeof MenuAPI.list>[0]
  ): Promise<PageResult<MenuItemDto>> => {
    const token = await getApiToken("Catalog", ["menu.read"]);
    const { data } = await http.get(MenuAPI.list(q), { headers: { Authorization: `Bearer ${token}` } });
    if (Array.isArray(data)) {
      const items = data as MenuItemDto[];
      return { items, page: 1, pageSize: items.length, total: items.length };
    }
    return data as PageResult<MenuItemDto>;
  },
  categories: async (): Promise<string[]> => {
    const token = await getApiToken("Catalog", ["menu.read"]);
    const { data } = await http.get(MenuAPI.categories, { headers: { Authorization: `Bearer ${token}` } });
    return data;
  },
  create: async (dto: CreateMenuItemDto): Promise<MenuItemDto> => {
    const token = await getApiToken("Catalog", ["menu.write"]);
    const { data } = await http.post(MenuAPI.create, dto, { headers: { Authorization: `Bearer ${token}` } });
    return data;
  },
  patch: async (id: string, dto: UpdateMenuItemDto): Promise<void> => {
    const token = await getApiToken("Catalog", ["menu.write"]);
    await http.patch(MenuAPI.patch(id), dto, { headers: { Authorization: `Bearer ${token}` } });
  },
  remove: async (id: string): Promise<void> => {
    const token = await getApiToken("Catalog", ["menu.write"]);
    await http.delete(MenuAPI.remove(id), { headers: { Authorization: `Bearer ${token}` } });
  },
  setAvailability: async (id: string, value: boolean): Promise<void> => {
    const token = await getApiToken("Catalog", ["menu.write"]);
    await http.post(MenuAPI.availability(id), value, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
  },
};
