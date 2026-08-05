import { publicHttp } from "@/lib/publicHttp";
import { DiscoveryAPI } from "./api";
import type { DiscoveryListingDto, DiscoveryQuery } from "./types";

// publicHttp, not http: these endpoints are anonymous and cross-tenant, and must not carry
// a staff token or tenant headers inferred from one. See lib/publicHttp.ts.
export const Discovery = {
  list: async (q?: DiscoveryQuery): Promise<DiscoveryListingDto[]> => {
    const { data } = await publicHttp.get<DiscoveryListingDto[]>(DiscoveryAPI.list(q));
    return data;
  },

  byId: async (restaurantId: string, locationId: string): Promise<DiscoveryListingDto> => {
    const { data } = await publicHttp.get<DiscoveryListingDto>(
      DiscoveryAPI.byId(restaurantId, locationId)
    );
    return data;
  },

  cuisines: async (): Promise<string[]> => {
    const { data } = await publicHttp.get<string[]>(DiscoveryAPI.cuisines);
    return data;
  },
};
