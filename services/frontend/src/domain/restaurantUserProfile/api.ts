import axios, { AxiosError, AxiosInstance } from "axios";
import { getApiToken } from "@/auth/getApiToken";
import type {
  OnboardRestaurantReq,
  OnboardRestaurantRes,
  UserProfile,
  OnboardingStatus,
  JoinRestaurantReq,
  MyJoinCodeRes,
} from "./types";

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

  /** GET /api/onboarding/me/code */
  getMyJoinCode: (params?: {
    rid?: string;
    lid?: string;
  }) => Promise<MyJoinCodeRes>;

  /** GET /users/me */
  getCurrentUserProfile: (params?: {
    rid?: string;
    lid?: string;
  }) => Promise<UserProfile>;
};

export type CreateApiOptions = {
  baseURL?: string; // legacy: used when both services are same base
  identityBaseURL?: string; // for /users/me
  tenantBaseURL?: string;   // for /api/onboarding/*
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

function withTenantHeaders(rid?: string, lid?: string) {
  const headers: Record<string, string> = {};
  if (rid) headers["X-Restaurant-Id"] = rid;
  if (lid) headers["X-Location-Id"] = lid;
  return headers;
}

function mergeHeaders(
  ...parts: Array<Record<string, string> | undefined>
): Record<string, string> {
  return Object.assign({}, ...parts.filter(Boolean));
}

/**
 * Creates an axios-backed API for restaurant user profile & onboarding.
 * Inject a getAccessToken function from your Auth layer.
 */
export function createRestaurantUserProfileApi(opts: CreateApiOptions): RestaurantUserProfileApi {
  // Back-compat: if only baseURL provided, use for both
  const identityBase = opts.identityBaseURL ?? opts.baseURL ?? "/";
  const tenantBase = opts.tenantBaseURL ?? opts.baseURL ?? "/";

  const idInstance = opts.axiosInstance ?? axios.create({ baseURL: identityBase });
  const tenantInstance = opts.axiosInstance ?? axios.create({ baseURL: tenantBase });

  const handleError = (e: unknown): never => {
    if (isAxiosError(e)) {
      const status = e.response?.status;
      if (status === 401) {
        throw new UnauthorizedError();
      }
      if (status === 400 || status === 409) {
        const msg = pickMessage(e.response?.data) ?? "Request failed";
        throw new ApiError(msg, status, e.response?.data);
      }
      const msg = pickMessage(e.response?.data) ?? e.message;
      throw new ApiError(msg, status, e.response?.data);
    }
    throw e as Error;
  };

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
        handleError(e);
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
        handleError(e);
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
        handleError(e);
      }
    },

    /**
     * GET /api/onboarding/me/code
     */
    async getMyJoinCode(params?: {
      rid?: string;
      lid?: string;
    }): Promise<MyJoinCodeRes> {
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
        handleError(e);
      }
    },

    /**
     * GET /users/me
     */
    async getCurrentUserProfile(params?: {
      rid?: string;
      lid?: string;
    }): Promise<UserProfile> {
      try {
        // IdentityService local API expects scope IdentityServerApi and audience set
        const idHeaders = { Authorization: `Bearer ${await getApiToken('IdentityServerApi', ['IdentityServerApi'])}` };
        const res = await idInstance.get<UserProfile>("/users/me", { headers: idHeaders });
        return res.data;
      } catch (e) {
        handleError(e);
      }
    },
  };
}
