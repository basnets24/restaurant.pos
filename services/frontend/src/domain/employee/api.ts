import axios, { type AxiosInstance } from "axios";
import { getApiToken } from "@/auth/getApiToken";
import { withTenantHeaders } from "@/auth/tenantHeaders";
import { UnauthorizedError, ApiError, mergeHeaders, toApiError } from "@/lib/apiErrors";
export { UnauthorizedError, ApiError };

// Types (DTOs)
export type GuidString = string;

export type EmployeeListItemDto = {
  userId: GuidString;
  email: string | null;
  userName: string | null;
  displayName: string | null;
  defaultLocationId: string | null;
  tenantRoles: readonly string[];
};

export type EmployeeDetailDto = {
  userId: GuidString;
  email: string | null;
  userName: string | null;
  displayName: string | null;
  emailConfirmed: boolean;
  lockedOut: boolean;
  defaultLocationId: string | null;
  tenantRoles: readonly string[];
};

export type AddEmployeeDto = {
  userId: GuidString;
  defaultLocationId?: string | null;
  roles?: readonly string[] | null;
};

export type DefaultLocationUpdateDto = {
  defaultLocationId: string;
};

export type EmployeeRoleUpdateDto = {
  roles: readonly string[];
};

export type UserUpdateDto = {
  userName?: string | null;
  email?: string | null;
  accessCode?: string | null; // 4–6 digits (server-validated)
  displayName?: string | null;
  lockoutEnabled?: boolean | null;
  lockoutEnd?: string | null; // DateTimeOffset ISO string
  twoFactorEnabled?: boolean | null;
};

export type Paged<T> = {
  items: readonly T[];
  page: number;
  pageSize: number;
  total: number;
};

type GetAccessToken = () => Promise<string | null | undefined>;

export type EmployeeApi = {
  listEmployees: (
    restaurantId: string,
    query?: { q?: string; role?: string; page?: number; pageSize?: number }
  ) => Promise<Paged<EmployeeListItemDto>>;

  getEmployeeById: (restaurantId: string, userId: string) => Promise<EmployeeDetailDto>;

  updateEmployee: (restaurantId: string, userId: string, body: UserUpdateDto) => Promise<void>;

  addEmployee: (restaurantId: string, body: AddEmployeeDto) => Promise<void>;

  updateDefaultLocation: (restaurantId: string, userId: string, body: DefaultLocationUpdateDto) => Promise<void>;

  getEmployeeRoles: (restaurantId: string, userId: string) => Promise<readonly string[]>;

  updateEmployeeRoles: (restaurantId: string, userId: string, body: EmployeeRoleUpdateDto) => Promise<void>;

  deleteEmployeeRole: (restaurantId: string, userId: string, role: string) => Promise<void>;

  getAvailableRoles: (restaurantId: string) => Promise<readonly string[]>;
};

export type CreateEmployeeApiOptions = {
  baseURL?: string;
  axiosInstance?: AxiosInstance;
  getAccessToken: GetAccessToken;
};

async function withIdentityHeaders() {
  const token = await getApiToken('IdentityServerApi', ['IdentityServerApi']);
  return { Authorization: `Bearer ${token}` } as Record<string, string>;
}

export function createEmployeeApi(opts: CreateEmployeeApiOptions): EmployeeApi {
  const instance = opts.axiosInstance ?? axios.create({ baseURL: opts.baseURL ?? "/" });

  const path = (rid: string, suffix = "") => `/tenants/${encodeURIComponent(rid)}/employees${suffix}`;

  return {
    async listEmployees(restaurantId, query) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders({ restaurantId }));
        const res = await instance.get<Paged<EmployeeListItemDto>>(path(restaurantId), {
          headers,
          params: {
            q: query?.q,
            role: query?.role,
            page: query?.page,
            pageSize: query?.pageSize,
          },
        });
        return res.data;
      } catch (e) { throw toApiError(e); }
    },

    async getEmployeeById(restaurantId, userId) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders({ restaurantId }));
        const res = await instance.get<EmployeeDetailDto>(path(restaurantId, `/${encodeURIComponent(userId)}`), { headers });
        return res.data;
      } catch (e) { throw toApiError(e); }
    },

    async updateEmployee(restaurantId, userId, body) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders({ restaurantId }));
        await instance.put(path(restaurantId, `/${encodeURIComponent(userId)}`), body, { headers });
      } catch (e) { throw toApiError(e); }
    },

    async addEmployee(restaurantId, body) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders({ restaurantId }));
        await instance.post(path(restaurantId), body, { headers });
      } catch (e) { throw toApiError(e); }
    },

    async updateDefaultLocation(restaurantId, userId, body) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders({ restaurantId }));
        await instance.put(path(restaurantId, `/${encodeURIComponent(userId)}/default-location`), body, { headers });
      } catch (e) { throw toApiError(e); }
    },

    async getEmployeeRoles(restaurantId, userId) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders({ restaurantId }));
        const res = await instance.get<readonly string[]>(path(restaurantId, `/${encodeURIComponent(userId)}/roles`), { headers });
        return res.data;
      } catch (e) { throw toApiError(e); }
    },

    async updateEmployeeRoles(restaurantId, userId, body) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders({ restaurantId }));
        await instance.post(path(restaurantId, `/${encodeURIComponent(userId)}/roles`), body, { headers });
      } catch (e) { throw toApiError(e); }
    },

    async deleteEmployeeRole(restaurantId, userId, role) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders({ restaurantId }));
        await instance.delete(path(restaurantId, `/${encodeURIComponent(userId)}/roles/${encodeURIComponent(role)}`), { headers });
      } catch (e) { throw toApiError(e); }
    },

    async getAvailableRoles(restaurantId) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders({ restaurantId }));
        const res = await instance.get<readonly string[]>(path(restaurantId, "/roles"), { headers });
        return res.data;
      } catch (e) { throw toApiError(e); }
    },
  };
}
