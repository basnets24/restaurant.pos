import { publicHttp } from "@/lib/publicHttp";
import { PublicMenuAPI } from "./api";
import type { PublicMenuDto } from "./types";

export const PublicMenu = {
  get: async (restaurantId: string, locationId: string): Promise<PublicMenuDto> => {
    const { data } = await publicHttp.get<PublicMenuDto>(
      PublicMenuAPI.menu(restaurantId, locationId)
    );
    return data;
  },
};
