export const IDENTITY_SCOPES_MIN = [
  "openid",
  "profile",
  "roles",
  "tenancy",
  "tenant.claims.read",
] as const;

export const AUDIENCES = [
  "Tenant",
  "Catalog",
  "Order",
  "Inventory",
  "Payment",
] as const;

export const API_SCOPES = {
  menu: ["menu.read", "menu.write"],
  order: ["order.read", "order.write"],
  inventory: ["inventory.read", "inventory.write"],
  payment: ["payment.read", "payment.charge", "payment.refund"],
} as const;

export type Audience = typeof AUDIENCES[number];

