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
import { errorStatus } from "@/lib/apiErrors";

function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = errorStatus(error);
  if (typeof status === "number" && status >= 400 && status < 500) return false;
  return failureCount < 2;
}

export function createTenantHooks(api: TenantApi) {
  function useMyTenants(options?: UseQueryOptions<readonly TenantRestaurantDto[], unknown>) {
    return useQuery<readonly TenantRestaurantDto[], unknown>({
      queryKey: tenantKeys.mine,
      queryFn: () => api.getMyTenants(),
      retry: shouldRetry,
      ...options,
    });
  }

  type TenantData = {
    restaurant: TenantRestaurantDto;
    locations: readonly TenantLocationDto[];
  };

  
  function useTenant(
    restaurantId: string,
    options?: Omit<
    UseQueryOptions<TenantData, unknown, TenantData, ReturnType<typeof tenantKeys.detail>>,
    "queryKey" | "queryFn"
  >
  ) {
    return useQuery<TenantData, unknown, TenantData, ReturnType<typeof tenantKeys.detail>>({
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
    const queryClient = useQueryClient();
    return useMutation<TenantLocationDto, unknown, CreateLocationDto>({
      mutationFn: (dto) => api.createLocation(restaurantId, dto),
      retry: shouldRetry,
      ...options,
      onSuccess: async (data, vars, onMutateResult, ctx) => {
        await queryClient.invalidateQueries({ queryKey: tenantKeys.detail(restaurantId) });
        options?.onSuccess?.(data, vars, onMutateResult, ctx);
      },
    });
  }

  function useUpdateLocation(
    restaurantId: string,
    locationId: string,
    options?: UseMutationOptions<void, unknown, UpdateLocationDto, unknown>
  ) {
    const queryClient = useQueryClient();
    return useMutation<void, unknown, UpdateLocationDto>({
      mutationFn: (dto) => api.updateLocation(restaurantId, locationId, dto),
      retry: shouldRetry,
      ...options,
      onSuccess: async (data, vars, onMutateResult, ctx) => {
        await queryClient.invalidateQueries({ queryKey: tenantKeys.detail(restaurantId) });
        options?.onSuccess?.(data, vars, onMutateResult, ctx);
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
