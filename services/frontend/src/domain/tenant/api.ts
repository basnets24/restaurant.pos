import axios, { AxiosError, AxiosInstance } from "axios";

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

// Errors
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") { super(message); this.name = "UnauthorizedError"; }
}

export class ApiError extends Error {
  status?: number;
  details?: unknown;
  constructor(message: string, status?: number, details?: unknown) {
    super(message); this.name = "ApiError"; this.status = status; this.details = details;
  }
}

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

function isAxiosError<T = any>(e: unknown): e is AxiosError<T> {
  return typeof e === "object" && e !== null && (e as any).isAxiosError === true;
}

function pickMessage(data: any): string | undefined {
  if (!data) return undefined;
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(", ");
  if (typeof data === "object") {
    if (typeof (data as any).message === "string") return (data as any).message;
    if (Array.isArray((data as any).errors)) return (data as any).errors.join(", ");
    if ((data as any).title) return String((data as any).title);
  }
  return undefined;
}

async function withAuthHeaders(getAccessToken: GetAccessToken) {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function withTenantHeaders(rid?: string) {
  const headers: Record<string, string> = {};
  if (rid) headers["X-Restaurant-Id"] = rid;
  return headers;
}

function mergeHeaders(...parts: Array<Record<string, string> | undefined>): Record<string, string> {
  return Object.assign({}, ...parts.filter(Boolean));
}

export function createTenantApi(opts: CreateTenantApiOptions): TenantApi {
  const instance = opts.axiosInstance ?? axios.create({ baseURL: opts.baseURL ?? "/" });

  const handleError = (e: unknown): never => {
    if (isAxiosError(e)) {
      const status = e.response?.status;
      if (status === 401) throw new UnauthorizedError();
      if (status === 400 || status === 409) {
        const msg = pickMessage(e.response?.data) ?? "Request failed";
        throw new ApiError(msg, status, e.response?.data);
      }
      const msg = pickMessage(e.response?.data) ?? e.message;
      throw new ApiError(msg, status, e.response?.data);
    }
    throw e as Error;
  };

  const base = "/tenants";

  return {
    async getMyTenants() {
      try {
        const headers = await withAuthHeaders(opts.getAccessToken);
        const res = await instance.get<readonly TenantRestaurantDto[]>(`${base}/mine`, { headers });
        return res.data;
      } catch (e) { handleError(e); }
    },

    async getTenant(restaurantId: string) {
      try {
        const headers = mergeHeaders(
          await withAuthHeaders(opts.getAccessToken),
          withTenantHeaders(restaurantId)
        );
        const res = await instance.get<{ restaurant: TenantRestaurantDto; locations: readonly TenantLocationDto[] }>(
          `${base}/${encodeURIComponent(restaurantId)}`,
          { headers }
        );
        return res.data;
      } catch (e) { handleError(e); }
    },

    async createLocation(restaurantId: string, body: CreateLocationDto) {
      try {
        const headers = mergeHeaders(
          await withAuthHeaders(opts.getAccessToken),
          withTenantHeaders(restaurantId)
        );
        const res = await instance.post<TenantLocationDto>(
          `${base}/${encodeURIComponent(restaurantId)}/locations`,
          body,
          { headers }
        );
        return res.data;
      } catch (e) { handleError(e); }
    },

    async updateLocation(restaurantId: string, locationId: string, body: UpdateLocationDto) {
      try {
        const headers = mergeHeaders(
          await withAuthHeaders(opts.getAccessToken),
          withTenantHeaders(restaurantId)
        );
        await instance.put(
          `${base}/${encodeURIComponent(restaurantId)}/locations/${encodeURIComponent(locationId)}`,
          body,
          { headers }
        );
      } catch (e) { handleError(e); }
    },
  };
}

