import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type {
  EmployeeApi,
  Paged,
  EmployeeListItemDto,
  EmployeeDetailDto,
  AddEmployeeDto,
  DefaultLocationUpdateDto,
  EmployeeRoleUpdateDto,
  UserUpdateDto,
} from "./api";
import { employeeKeys } from "./keys";

// Conservative retry: don't retry 4xx; retry 2x otherwise
function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = (error as any)?.status ?? (error as any)?.response?.status;
  if (typeof status === "number" && status >= 400 && status < 500) return false; // don't retry 4xx
  return failureCount < 2; // retry up to 2 times otherwise
}

export function createEmployeeHooks(api: EmployeeApi) {
  const qc = () => useQueryClient();

  // ---------- List
  function useEmployees(
    restaurantId: string,
    query?: { q?: string; role?: string; page?: number; pageSize?: number },
    options?: Omit<
      UseQueryOptions<
        Paged<EmployeeListItemDto>,                 // TQueryFnData
        unknown,                                    // TError
        Paged<EmployeeListItemDto>,                 // TData (after select)
        ReturnType<typeof employeeKeys.list>        // TQueryKey
      >,
      "queryKey" | "queryFn"
    >
  ) {
    return useQuery<
      Paged<EmployeeListItemDto>,
      unknown,
      Paged<EmployeeListItemDto>,
      ReturnType<typeof employeeKeys.list>
    >({
      queryKey: employeeKeys.list(restaurantId, query),
      queryFn: () => api.listEmployees(restaurantId, query),
      enabled: Boolean(restaurantId),
      retry: shouldRetry,
      ...options,
    });
  }

  // ---------- Detail
  function useEmployee(
    restaurantId: string,
    userId: string,
    options?: Omit<
      UseQueryOptions<
        EmployeeDetailDto,
        unknown,
        EmployeeDetailDto,
        ReturnType<typeof employeeKeys.detail>
      >,
      "queryKey" | "queryFn"
    >
  ) {
    return useQuery<
      EmployeeDetailDto,
      unknown,
      EmployeeDetailDto,
      ReturnType<typeof employeeKeys.detail>
    >({
      queryKey: employeeKeys.detail(restaurantId, userId),
      queryFn: () => api.getEmployeeById(restaurantId, userId),
      enabled: Boolean(restaurantId && userId),
      retry: shouldRetry,
      ...options,
    });
  }

  // ---------- Roles of employee
  function useEmployeeRoles(
    restaurantId: string,
    userId: string,
    options?: Omit<
      UseQueryOptions<
        readonly string[],
        unknown,
        readonly string[],
        ReturnType<typeof employeeKeys.roles>
      >,
      "queryKey" | "queryFn"
    >
  ) {
    return useQuery<
      readonly string[],
      unknown,
      readonly string[],
      ReturnType<typeof employeeKeys.roles>
    >({
      queryKey: employeeKeys.roles(restaurantId, userId),
      queryFn: () => api.getEmployeeRoles(restaurantId, userId),
      enabled: Boolean(restaurantId && userId),
      retry: shouldRetry,
      ...options,
    });
  }

  // ---------- Available role names
  function useAvailableRoles(
    restaurantId: string,
    options?: Omit<
      UseQueryOptions<
        readonly string[],
        unknown,
        readonly string[],
        ReturnType<typeof employeeKeys.roleNames>
      >,
      "queryKey" | "queryFn"
    >
  ) {
    return useQuery<
      readonly string[],
      unknown,
      readonly string[],
      ReturnType<typeof employeeKeys.roleNames>
    >({
      queryKey: employeeKeys.roleNames(restaurantId),
      queryFn: () => api.getAvailableRoles(restaurantId),
      enabled: Boolean(restaurantId),
      retry: shouldRetry,
      ...options,
    });
  }

  // ---------- Mutations
  function useAddEmployee(
    restaurantId: string,
    options?: UseMutationOptions<void, unknown, AddEmployeeDto, unknown>
  ) {
    const queryClient = qc();
    return useMutation<void, unknown, AddEmployeeDto>({
      mutationFn: (dto) => api.addEmployee(restaurantId, dto),
      retry: shouldRetry,
      ...options,
      onSuccess: async (data, vars, ctx) => {
        await queryClient.invalidateQueries({ queryKey: employeeKeys.list(restaurantId) });
        options?.onSuccess?.(data, vars, ctx);
      },
    });
  }

  function useUpdateEmployee(
    restaurantId: string,
    userId: string,
    options?: UseMutationOptions<void, unknown, UserUpdateDto, unknown>
  ) {
    const queryClient = qc();
    return useMutation<void, unknown, UserUpdateDto>({
      mutationFn: (dto) => api.updateEmployee(restaurantId, userId, dto),
      retry: shouldRetry,
      ...options,
      onSuccess: async (data, vars, ctx) => {
        await Promise.allSettled([
          queryClient.invalidateQueries({ queryKey: employeeKeys.detail(restaurantId, userId) }),
          queryClient.invalidateQueries({ queryKey: employeeKeys.list(restaurantId) }),
        ]);
        options?.onSuccess?.(data, vars, ctx);
      },
    });
  }

  function useUpdateDefaultLocation(
    restaurantId: string,
    userId: string,
    options?: UseMutationOptions<void, unknown, DefaultLocationUpdateDto, unknown>
  ) {
    const queryClient = qc();
    return useMutation<void, unknown, DefaultLocationUpdateDto>({
      mutationFn: (dto) => api.updateDefaultLocation(restaurantId, userId, dto),
      retry: shouldRetry,
      ...options,
      onSuccess: async (data, vars, ctx) => {
        await Promise.allSettled([
          queryClient.invalidateQueries({ queryKey: employeeKeys.detail(restaurantId, userId) }),
          queryClient.invalidateQueries({ queryKey: employeeKeys.list(restaurantId) }),
        ]);
        options?.onSuccess?.(data, vars, ctx);
      },
    });
  }

  function useUpdateEmployeeRoles(
    restaurantId: string,
    userId: string,
    options?: UseMutationOptions<void, unknown, EmployeeRoleUpdateDto, unknown>
  ) {
    const queryClient = qc();
    return useMutation<void, unknown, EmployeeRoleUpdateDto>({
      mutationFn: (dto) => api.updateEmployeeRoles(restaurantId, userId, dto),
      retry: shouldRetry,
      ...options,
      onSuccess: async (data, vars, ctx) => {
        await Promise.allSettled([
          queryClient.invalidateQueries({ queryKey: employeeKeys.roles(restaurantId, userId) }),
          queryClient.invalidateQueries({ queryKey: employeeKeys.detail(restaurantId, userId) }),
        ]);
        options?.onSuccess?.(data, vars, ctx);
      },
    });
  }

  function useDeleteEmployeeRole(
    restaurantId: string,
    userId: string,
    options?: UseMutationOptions<void, unknown, string, unknown>
  ) {
    const queryClient = qc();
    return useMutation<void, unknown, string>({
      mutationFn: (role: string) => api.deleteEmployeeRole(restaurantId, userId, role),
      retry: shouldRetry,
      ...options,
      onSuccess: async (data, vars, ctx) => {
        await Promise.allSettled([
          queryClient.invalidateQueries({ queryKey: employeeKeys.roles(restaurantId, userId) }),
          queryClient.invalidateQueries({ queryKey: employeeKeys.detail(restaurantId, userId) }),
        ]);
        options?.onSuccess?.(data, vars, ctx);
      },
    });
  }

  return {
    useEmployees,
    useEmployee,
    useEmployeeRoles,
    useAvailableRoles,
    useAddEmployee,
    useUpdateEmployee,
    useUpdateDefaultLocation,
    useUpdateEmployeeRoles,
    useDeleteEmployeeRole,
  };
}
