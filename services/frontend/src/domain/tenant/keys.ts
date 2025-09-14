// TanStack Query keys for tenant domain

export const tenantKeys = {
  all: ["tenants"] as const,
  mine: ["tenants", "mine"] as const,
  detail: (restaurantId: string) => [...tenantKeys.all, "detail", { rid: restaurantId }] as const,
};

