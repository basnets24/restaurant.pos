import type { DinerCheckoutRequest, DinerTenant } from "./types";

export const DinerOrderKeys = {
  all: ["dinerOrders"] as const,
  list: (tenant: DinerTenant) => ["dinerOrders", tenant.restaurantId, tenant.locationId] as const,
  detail: (orderId: string) => ["dinerOrders", "detail", orderId] as const,
  // Keyed on the lines themselves, not the cart id: a quote must be refetched when the cart
  // changes, and the cart id deliberately stays stable across edits so checkout stays idempotent.
  quote: (tenant: DinerTenant, body: DinerCheckoutRequest) =>
    [
      "dinerQuote",
      tenant.restaurantId,
      tenant.locationId,
      body.items.map((i) => `${i.menuItemId}:${i.quantity}:${[...i.optionIds].sort().join("+")}`).join("|"),
    ] as const,
};
