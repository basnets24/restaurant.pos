export const IdentityKeys = {
  users: (params?: unknown) => ["users", params] as const,
  roles: {
    all: ["roles", "all"] as const,
  },
};

