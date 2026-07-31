import axios from "axios";
import type { AxiosInstance } from "axios";
import { withTenantHeaders } from "@/auth/tenantHeaders";
import { UnauthorizedError, ApiError, mergeHeaders, toApiError } from "@/lib/apiErrors";
export { UnauthorizedError, ApiError };

// DTOs
export type TenantRestaurantDto = {
  id: string;
  name: string;
  slug: string | null;
  isActive: boolean;
  createdUtc: string; // ISO string
};

export type TenantLocationDto = {
  id: string;
  restaurantId: string;
  name: string;
  isActive: boolean;
  createdUtc: string; // ISO string
  timeZoneId: string | null;
};

export type CreateLocationDto = {
  name: string;
  timeZoneId?: string | null;
};

export type UpdateLocationDto = {
  name: string;
  isActive: boolean;
  timeZoneId?: string | null;
};

type GetAccessToken = () => Promise<string | null | undefined>;

export type TenantApi = {
  getMyTenants: () => Promise<readonly TenantRestaurantDto[]>;
  getTenant: (restaurantId: string) => Promise<{ restaurant: TenantRestaurantDto; locations: readonly TenantLocationDto[] }>;
  createLocation: (restaurantId: string, body: CreateLocationDto) => Promise<TenantLocationDto>;
  updateLocation: (restaurantId: string, locationId: string, body: UpdateLocationDto) => Promise<void>;
};

export type CreateTenantApiOptions = {
  baseURL?: string;
  axiosInstance?: AxiosInstance;
  getAccessToken: GetAccessToken;
};

async function withAuthHeaders(getAccessToken: GetAccessToken) {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export function createTenantApi(opts: CreateTenantApiOptions): TenantApi {
  const instance = opts.axiosInstance ?? axios.create({ baseURL: opts.baseURL ?? "/" });

  const base = "/tenants";

  return {
    async getMyTenants() {
      try {
        const headers = await withAuthHeaders(opts.getAccessToken);
        const res = await instance.get<readonly TenantRestaurantDto[]>(`${base}/mine`, { headers });
        return res.data;
      } catch (e) { throw toApiError(e); }
    },

    async getTenant(restaurantId: string) {
      try {
        const headers = mergeHeaders(
          await withAuthHeaders(opts.getAccessToken),
          withTenantHeaders({ restaurantId })
        );
        const res = await instance.get<{ restaurant: TenantRestaurantDto; locations: readonly TenantLocationDto[] }>(
          `${base}/${encodeURIComponent(restaurantId)}`,
          { headers }
        );
        return res.data;
      } catch (e) { throw toApiError(e); }
    },

    async createLocation(restaurantId: string, body: CreateLocationDto) {
      try {
        const headers = mergeHeaders(
          await withAuthHeaders(opts.getAccessToken),
          withTenantHeaders({ restaurantId })
        );
        const res = await instance.post<TenantLocationDto>(
          `${base}/${encodeURIComponent(restaurantId)}/locations`,
          body,
          { headers }
        );
        return res.data;
      } catch (e) { throw toApiError(e); }
    },

    async updateLocation(restaurantId: string, locationId: string, body: UpdateLocationDto) {
      try {
        const headers = mergeHeaders(
          await withAuthHeaders(opts.getAccessToken),
          withTenantHeaders({ restaurantId })
        );
        await instance.put(
          `${base}/${encodeURIComponent(restaurantId)}/locations/${encodeURIComponent(locationId)}`,
          body,
          { headers }
        );
      } catch (e) { throw toApiError(e); }
    },
  };
}
