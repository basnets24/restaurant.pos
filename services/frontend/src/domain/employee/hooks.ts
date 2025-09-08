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

function shouldRetry(error: unknown, failureCount: number): boolean {
  const maybeStatus = (error as any)?.status ?? (error as any)?.response?.status;
  if (typeof maybeStatus === "number" && maybeStatus >= 400 && maybeStatus < 500) return false;
  return failureCount < 2;
}

export function createEmployeeHooks(api: EmployeeApi) {
  const qc = () => useQueryClient();

  // List
  function useEmployees(
    restaurantId: string,
    query?: { q?: string; role?: string; page?: number; pageSize?: number },
    options?: UseQueryOptions<Paged<EmployeeListItemDto>, unknown>
  ) {
    return useQuery<Paged<EmployeeListItemDto>, unknown>({
      queryKey: employeeKeys.list(restaurantId, query),
      queryFn: () => api.listEmployees(restaurantId, query),
      enabled: Boolean(restaurantId),
      retry: shouldRetry,
      ...options,
    });
  }

  // Detail
  function useEmployee(
    restaurantId: string,
    userId: string,
    options?: UseQueryOptions<EmployeeDetailDto, unknown>
  ) {
    return useQuery<EmployeeDetailDto, unknown>({
      queryKey: employeeKeys.detail(restaurantId, userId),
      queryFn: () => api.getEmployeeById(restaurantId, userId),
      enabled: Boolean(restaurantId && userId),
      retry: shouldRetry,
      ...options,
    });
  }

  // Roles of employee
  function useEmployeeRoles(
    restaurantId: string,
    userId: string,
    options?: UseQueryOptions<readonly string[], unknown>
  ) {
    return useQuery<readonly string[], unknown>({
      queryKey: employeeKeys.roles(restaurantId, userId),
      queryFn: () => api.getEmployeeRoles(restaurantId, userId),
      enabled: Boolean(restaurantId && userId),
      retry: shouldRetry,
      ...options,
    });
  }

  // Available role names
  function useAvailableRoles(
    restaurantId: string,
    options?: UseQueryOptions<readonly string[], unknown>
  ) {
    return useQuery<readonly string[], unknown>({
      queryKey: employeeKeys.roleNames(restaurantId),
      queryFn: () => api.getAvailableRoles(restaurantId),
      enabled: Boolean(restaurantId),
      retry: shouldRetry,
      ...options,
    });
  }

  // Add employee
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
        options?.onSuccess?.(data, vars, ctx as any);
      },
    });
  }

  // Update employee
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
        options?.onSuccess?.(data, vars, ctx as any);
      },
    });
  }

  // Update default location
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
        options?.onSuccess?.(data, vars, ctx as any);
      },
    });
  }

  // Update employee roles
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
        options?.onSuccess?.(data, vars, ctx as any);
      },
    });
  }

  // Delete a single role from employee
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
        options?.onSuccess?.(data, vars, ctx as any);
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

