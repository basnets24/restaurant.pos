import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type {
  TenantApi,
  TenantRestaurantDto,
  TenantLocationDto,
  CreateLocationDto,
  UpdateLocationDto,
} from "./api";
import { tenantKeys } from "./keys";

function shouldRetry(error: unknown, failureCount: number): boolean {
  const maybeStatus = (error as any)?.status ?? (error as any)?.response?.status;
  if (typeof maybeStatus === "number" && maybeStatus >= 400 && maybeStatus < 500) return false;
  return failureCount < 2;
}

export function createTenantHooks(api: TenantApi) {
  const qc = () => useQueryClient();

  function useMyTenants(options?: UseQueryOptions<readonly TenantRestaurantDto[], unknown>) {
    return useQuery<readonly TenantRestaurantDto[], unknown>({
      queryKey: tenantKeys.mine,
      queryFn: () => api.getMyTenants(),
      retry: shouldRetry,
      ...options,
    });
  }

  function useTenant(
    restaurantId: string,
    options?: UseQueryOptions<{ restaurant: TenantRestaurantDto; locations: readonly TenantLocationDto[] }, unknown>
  ) {
    return useQuery<{ restaurant: TenantRestaurantDto; locations: readonly TenantLocationDto[] }, unknown>({
      queryKey: tenantKeys.detail(restaurantId),
      queryFn: () => api.getTenant(restaurantId),
      enabled: Boolean(restaurantId),
      retry: shouldRetry,
      ...options,
    });
  }

  function useCreateLocation(
    restaurantId: string,
    options?: UseMutationOptions<TenantLocationDto, unknown, CreateLocationDto, unknown>
  ) {
    const queryClient = qc();
    return useMutation<TenantLocationDto, unknown, CreateLocationDto>({
      mutationFn: (dto) => api.createLocation(restaurantId, dto),
      retry: shouldRetry,
      ...options,
      onSuccess: async (data, vars, ctx) => {
        await queryClient.invalidateQueries({ queryKey: tenantKeys.detail(restaurantId) });
        options?.onSuccess?.(data, vars, ctx as any);
      },
    });
  }

  function useUpdateLocation(
    restaurantId: string,
    locationId: string,
    options?: UseMutationOptions<void, unknown, UpdateLocationDto, unknown>
  ) {
    const queryClient = qc();
    return useMutation<void, unknown, UpdateLocationDto>({
      mutationFn: (dto) => api.updateLocation(restaurantId, locationId, dto),
      retry: shouldRetry,
      ...options,
      onSuccess: async (data, vars, ctx) => {
        await queryClient.invalidateQueries({ queryKey: tenantKeys.detail(restaurantId) });
        options?.onSuccess?.(data, vars, ctx as any);
      },
    });
  }

  return {
    useMyTenants,
    useTenant,
    useCreateLocation,
    useUpdateLocation,
  };
}

