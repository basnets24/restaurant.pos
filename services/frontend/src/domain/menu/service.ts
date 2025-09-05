import { http } from "@/lib/http";
import { MenuAPI } from "./api";
import type { MenuItemDto, CreateMenuItemDto, UpdateMenuItemDto, PageResult } from "./types";

export const MenuItems = {
  list: async (
    q?: Parameters<typeof MenuAPI.list>[0]
  ): Promise<PageResult<MenuItemDto>> => {
    const { data } = await http.get(MenuAPI.list(q));
    return data;
  },
  categories: async (): Promise<string[]> => {
    const { data } = await http.get(MenuAPI.categories);
    return data;
  },
  create: async (dto: CreateMenuItemDto): Promise<MenuItemDto> => {
    const { data } = await http.post(MenuAPI.create, dto);
    return data;
  },
  patch: async (id: string, dto: UpdateMenuItemDto): Promise<void> => {
    await http.patch(MenuAPI.patch(id), dto);
  },
  remove: async (id: string): Promise<void> => {
    await http.delete(MenuAPI.remove(id));
  },
  setAvailability: async (id: string, value: boolean): Promise<void> => {
    await http.post(MenuAPI.availability(id), value, {
      headers: { "Content-Type": "application/json" },
    });
  },
};

