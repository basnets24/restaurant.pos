// TanStack Query keys for employees

export const employeeKeys = {
  all: ["employees"] as const,
  list: (
    restaurantId: string,
    params?: { q?: string; role?: string; page?: number; pageSize?: number }
  ) =>
    [
      ...employeeKeys.all,
      "list",
      { rid: restaurantId, q: params?.q ?? null, role: params?.role ?? null, page: params?.page ?? 1, pageSize: params?.pageSize ?? 20 }
    ] as const,
  detail: (restaurantId: string, userId: string) =>
    [...employeeKeys.all, "detail", { rid: restaurantId, userId }] as const,
  roles: (restaurantId: string, userId: string) =>
    [...employeeKeys.all, "roles", { rid: restaurantId, userId }] as const,
  roleNames: (restaurantId: string) =>
    [...employeeKeys.all, "role-names", { rid: restaurantId }] as const,
};

