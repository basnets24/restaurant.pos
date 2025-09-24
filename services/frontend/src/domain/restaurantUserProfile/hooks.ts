import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { RestaurantUserProfileApi } from "./api";
import { userProfileKey, onboardingKey } from "./keys";
import type {
  OnboardRestaurantReq,
  OnboardRestaurantRes,
  UserProfile,
  OnboardingStatus,
  JoinRestaurantReq,
  MyJoinCodeRes,
} from "./types";

function shouldRetry(failureCount: number, error: unknown): boolean {
  const maybeStatus = (error as any)?.status ?? (error as any)?.response?.status;
  if (typeof maybeStatus === "number" && maybeStatus >= 400 && maybeStatus < 500) {
    return false; // don't retry on 4xx
  }
  return failureCount < 2;
}

export type UseCurrentUserProfileParams = {
  rid?: string;
  lid?: string;
};

export type UseOnboardingStatusParams = {
  rid?: string;
  lid?: string;
};

export function createRestaurantUserProfileHooks(
  api: RestaurantUserProfileApi,
  opts?: { onAuthRefresh?: () => Promise<void> }
) {
  const qc = () => useQueryClient();

  /**
   * Onboard restaurant mutation.
   * Invalidates user profile and onboarding status on success.
   */
  function useOnboardRestaurant(
    options?: UseMutationOptions<OnboardRestaurantRes, unknown, OnboardRestaurantReq, unknown>
  ) {
    const queryClient = qc();
    return useMutation<OnboardRestaurantRes, unknown, OnboardRestaurantReq>({
      mutationFn: (req) => api.onboardRestaurant(req),
      retry: shouldRetry,
      ...options,
      onSuccess: async (data, vars, ctx) => {
        await Promise.allSettled([
          queryClient.invalidateQueries({ queryKey: userProfileKey }),
          queryClient.invalidateQueries({ queryKey: onboardingKey }),
        ]);
        // After onboarding, refresh token/claims if provided
        if (opts?.onAuthRefresh) {
          try { await opts.onAuthRefresh(); } catch {}
        }
        options?.onSuccess?.(data, vars, ctx);
      },
    });
  }

  /**
   * Join restaurant by code.
   * Invalidates user profile and onboarding status on success.
   */
  function useJoinRestaurant(
    options?: UseMutationOptions<OnboardRestaurantRes, unknown, JoinRestaurantReq, unknown>
  ) {
    const queryClient = qc();
    return useMutation<OnboardRestaurantRes, unknown, JoinRestaurantReq>({
      mutationFn: (req) => api.joinRestaurant(req),
      retry: shouldRetry,
      ...options,
      onSuccess: async (data, vars, ctx) => {
        await Promise.allSettled([
          queryClient.invalidateQueries({ queryKey: userProfileKey }),
          queryClient.invalidateQueries({ queryKey: onboardingKey }),
        ]);
        if (opts?.onAuthRefresh) {
          try { await opts.onAuthRefresh(); } catch {}
        }
        options?.onSuccess?.(data, vars, ctx);
      },
    });
  }

  /**
   * Current user profile query.
   */
  function useCurrentUserProfile(
    params?: UseCurrentUserProfileParams,
    options?: Omit<UseQueryOptions<UserProfile, unknown>, 'queryKey' | 'queryFn'>
  ) {
    return useQuery<UserProfile, unknown>({
      queryKey: userProfileKey,
      queryFn: () => api.getCurrentUserProfile({ rid: params?.rid, lid: params?.lid }),
      retry: shouldRetry,
      ...options,
    });
  }

  /**
   * Onboarding status query (handy for routing).
   */
  function useOnboardingStatus(
    params?: UseOnboardingStatusParams,
    options?: Omit<UseQueryOptions<OnboardingStatus, unknown>, 'queryKey' | 'queryFn'>
  ) {
    return useQuery<OnboardingStatus, unknown>({
      queryKey: onboardingKey,
      queryFn: () => api.getOnboardingStatus({ rid: params?.rid, lid: params?.lid }),
      retry: shouldRetry,
      ...options,
    });
  }

  /**
   * Get my join code (slug + restaurantId + optional joinUrl).
   */
  function useMyJoinCode(
    params?: { rid?: string; lid?: string },
    options?: Omit<UseQueryOptions<MyJoinCodeRes, unknown>, 'queryKey' | 'queryFn'>
  ) {
    return useQuery<MyJoinCodeRes, unknown>({
      queryKey: onboardingKey,
      queryFn: () => api.getMyJoinCode({ rid: params?.rid, lid: params?.lid }),
      retry: false,        // 404 → null is a valid state
      staleTime: 60_000,
      ...options,
    });
  }

  return {
    useOnboardRestaurant,
    useCurrentUserProfile,
    useOnboardingStatus,
    useJoinRestaurant,
    useMyJoinCode,
  };
}
