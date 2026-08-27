export const DinerNotificationKeys = {
  all: ["dinerNotifications"] as const,
  // No tenant in the key, same as the history key: these span restaurants, so a per-tenant
  // entry would cache one answer under several names.
  list: () => ["dinerNotifications", "list"] as const,
};
