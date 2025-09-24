import axios, { AxiosError, type AxiosInstance } from "axios";
import { getApiToken } from "@/auth/getApiToken";
import type {
  OnboardRestaurantReq,
  OnboardRestaurantRes,
  UserProfile,
  OnboardingStatus,
  JoinRestaurantReq,
  MyJoinCodeRes,
} from "./types";

/** Domain errors */
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ApiError extends Error {
  status?: number;
  details?: unknown;
  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

/** Types */
type GetAccessToken = () => Promise<string | null>;

export type RestaurantUserProfileApi = {
  /** POST /api/onboarding/restaurant */
  onboardRestaurant: (
    req: OnboardRestaurantReq
  ) => Promise<OnboardRestaurantRes>;

  /** POST /api/onboarding/join */
  joinRestaurant: (
    req: JoinRestaurantReq,
    params?: { rid?: string; lid?: string }
  ) => Promise<OnboardRestaurantRes>;

  /** GET /api/onboarding/status */
  getOnboardingStatus: (params?: {
    rid?: string;
    lid?: string;
  }) => Promise<OnboardingStatus>;

  /** GET /api/onboarding/me/code (returns null on 404) */
  getMyJoinCode: (params?: {
    rid?: string;
    lid?: string;
  }) => Promise<MyJoinCodeRes | null>;

  /** GET /users/me */
  getCurrentUserProfile: (params?: {
    rid?: string;
    lid?: string;
  }) => Promise<UserProfile>;
};

export type CreateApiOptions = {
  baseURL?: string;        // legacy: used when both services share a base
  identityBaseURL?: string; // for /users/me
  tenantBaseURL?: string;   // for /api/onboarding/*
  axiosInstance?: AxiosInstance;
  getAccessToken: GetAccessToken;
};

/** Narrow unknown to AxiosError */
function isAxiosError<T = unknown>(e: unknown): e is AxiosError<T> {
  return typeof e === "object" && e !== null && (e as any).isAxiosError === true;
}

/** Extract a reasonable message from common error payload shapes */
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

/** Build auth header from access token provider */
async function withAuthHeaders(getAccessToken: GetAccessToken) {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/** Tenant routing headers */
function withTenantHeaders(rid?: string, lid?: string) {
  const headers: Record<string, string> = {};
  if (rid) headers["x-restaurant-id"] = rid;
  if (lid) headers["x-location-id"] = lid;
  return headers;
}

/** Shallow-merge header objects */
function mergeHeaders(
  ...parts: Array<Record<string, string> | undefined>
): Record<string, string> {
  return Object.assign({}, ...parts.filter(Boolean));
}

/** Convert any error to our domain error types */
function toApiError(e: unknown): Error {
  if (isAxiosError(e)) {
    const status = e.response?.status;
    if (status === 401) return new UnauthorizedError();

    const msg = pickMessage(e.response?.data) ?? e.message;

    if (status === 400 || status === 409) {
      return new ApiError(msg, status, e.response?.data);
    }
    return new ApiError(msg, status, e.response?.data);
  }
  return e instanceof Error ? e : new Error(String(e));
}

/**
 * Creates an axios-backed API for restaurant user profile & onboarding.
 * Inject a getAccessToken function from your Auth layer.
 */
export function createRestaurantUserProfileApi(opts: CreateApiOptions): RestaurantUserProfileApi {
  // Back-compat: if only baseURL provided, use for both
  const identityBase = opts.identityBaseURL ?? opts.baseURL ?? "/";
  const tenantBase = opts.tenantBaseURL ?? opts.baseURL ?? "/";

  // Allow caller to inject a pre-configured axios instance; otherwise create separate ones
  const idInstance = opts.axiosInstance ?? axios.create({ baseURL: identityBase });
  const tenantInstance = opts.axiosInstance ?? axios.create({ baseURL: tenantBase });

  return {
    /**
     * POST /api/onboarding/restaurant
     * Do not attach tenant headers for this initial call.
     */
    async onboardRestaurant(
      req: OnboardRestaurantReq
    ): Promise<OnboardRestaurantRes> {
      try {
        const headers = await withAuthHeaders(opts.getAccessToken);
        const res = await tenantInstance.post<OnboardRestaurantRes>(
          "/api/onboarding/restaurant",
          req,
          { headers }
        );
        return res.data;
      } catch (e) {
        throw toApiError(e);
      }
    },

    /**
     * POST /api/onboarding/join
     */
    async joinRestaurant(
      req: JoinRestaurantReq,
      params?: { rid?: string; lid?: string }
    ): Promise<OnboardRestaurantRes> {
      try {
        const headers = mergeHeaders(
          await withAuthHeaders(opts.getAccessToken),
          withTenantHeaders(params?.rid, params?.lid)
        );
        const res = await tenantInstance.post<OnboardRestaurantRes>(
          "/api/onboarding/join",
          req,
          { headers }
        );
        return res.data;
      } catch (e) {
        throw toApiError(e);
      }
    },

    /**
     * GET /api/onboarding/status
     */
    async getOnboardingStatus(params?: {
      rid?: string;
      lid?: string;
    }): Promise<OnboardingStatus> {
      try {
        const headers = mergeHeaders(
          await withAuthHeaders(opts.getAccessToken),
          withTenantHeaders(params?.rid, params?.lid)
        );
        const res = await tenantInstance.get<OnboardingStatus>(
          "/api/onboarding/status",
          { headers }
        );
        return res.data;
      } catch (e) {
        throw toApiError(e);
      }
    },

    /**
     * GET /api/onboarding/me/code
     * Returns null if the join code doesn't exist (404).
     */
    async getMyJoinCode(params?: {
      rid?: string;
      lid?: string;
    }): Promise<MyJoinCodeRes | null> {
      try {
        const headers = mergeHeaders(
          await withAuthHeaders(opts.getAccessToken),
          withTenantHeaders(params?.rid, params?.lid)
        );
        const res = await tenantInstance.get<MyJoinCodeRes>(
          "/api/onboarding/me/code",
          { headers }
        );
        return res.data;
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 404) {
          return null;
        }
        throw toApiError(e);
      }
    },

    /**
     * GET /users/me
     * Uses IdentityService audience/scope via getApiToken helper.
     */
    async getCurrentUserProfile(params?: {
      rid?: string;
      lid?: string;
    }): Promise<UserProfile> {
      try {
        // If you prefer to reuse opts.getAccessToken(), swap this for withAuthHeaders().
        const idHeaders = {
          Authorization: `Bearer ${await getApiToken("IdentityServerApi", ["IdentityServerApi"])}`,
          ...withTenantHeaders(params?.rid, params?.lid), // include tenant if needed downstream
        };
        const res = await idInstance.get<UserProfile>("/users/me", { headers: idHeaders });
        return res.data;
      } catch (e) {
        throw toApiError(e);
      }
    },
  };
}
