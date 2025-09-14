import axios, { AxiosError, AxiosInstance } from "axios";
import { getApiToken } from "@/auth/getApiToken";

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

async function withIdentityHeaders() {
  const token = await getApiToken('IdentityServerApi', ['IdentityServerApi']);
  return { Authorization: `Bearer ${token}` } as Record<string, string>;
}

function withTenantHeaders(rid?: string) {
  const headers: Record<string, string> = {};
  if (rid) headers["X-Restaurant-Id"] = rid;
  return headers;
}

function mergeHeaders(...parts: Array<Record<string, string> | undefined>): Record<string, string> {
  return Object.assign({}, ...parts.filter(Boolean));
}

export function createEmployeeApi(opts: CreateEmployeeApiOptions): EmployeeApi {
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

  const path = (rid: string, suffix = "") => `/tenants/${encodeURIComponent(rid)}/employees${suffix}`;

  return {
    async listEmployees(restaurantId, query) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders(restaurantId));
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
      } catch (e) { handleError(e); }
    },

    async getEmployeeById(restaurantId, userId) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders(restaurantId));
        const res = await instance.get<EmployeeDetailDto>(path(restaurantId, `/${encodeURIComponent(userId)}`), { headers });
        return res.data;
      } catch (e) { handleError(e); }
    },

    async updateEmployee(restaurantId, userId, body) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders(restaurantId));
        await instance.put(path(restaurantId, `/${encodeURIComponent(userId)}`), body, { headers });
      } catch (e) { handleError(e); }
    },

    async addEmployee(restaurantId, body) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders(restaurantId));
        await instance.post(path(restaurantId), body, { headers });
      } catch (e) { handleError(e); }
    },

    async updateDefaultLocation(restaurantId, userId, body) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders(restaurantId));
        await instance.put(path(restaurantId, `/${encodeURIComponent(userId)}/default-location`), body, { headers });
      } catch (e) { handleError(e); }
    },

    async getEmployeeRoles(restaurantId, userId) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders(restaurantId));
        const res = await instance.get<readonly string[]>(path(restaurantId, `/${encodeURIComponent(userId)}/roles`), { headers });
        return res.data;
      } catch (e) { handleError(e); }
    },

    async updateEmployeeRoles(restaurantId, userId, body) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders(restaurantId));
        await instance.post(path(restaurantId, `/${encodeURIComponent(userId)}/roles`), body, { headers });
      } catch (e) { handleError(e); }
    },

    async deleteEmployeeRole(restaurantId, userId, role) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders(restaurantId));
        await instance.delete(path(restaurantId, `/${encodeURIComponent(userId)}/roles/${encodeURIComponent(role)}`), { headers });
      } catch (e) { handleError(e); }
    },

    async getAvailableRoles(restaurantId) {
      try {
        const headers = mergeHeaders(await withIdentityHeaders(), withTenantHeaders(restaurantId));
        const res = await instance.get<readonly string[]>(path(restaurantId, "/roles"), { headers });
        return res.data;
      } catch (e) { handleError(e); }
    },
  };
}
