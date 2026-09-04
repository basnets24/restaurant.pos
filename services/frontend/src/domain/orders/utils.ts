import type { OrderDto } from "./types";

// "Fired to the kitchen and not yet delivered" - the set ActiveOrdersPage and
// the nav badge counts show. Pending excludes Paid/Cancelled/Rejected; !servedAt
// excludes orders the kitchen already marked delivered (see Order.ServedAt).
export function isActiveKitchenOrder(o: OrderDto): boolean {
  return (o.status ?? "").toLowerCase() === "pending" && !o.servedAt;
}

// A Pickup order has no tableId - that's the order type, not a missing/broken
// table link. Views that show "Table N" need to branch on this instead of
// falling through to a table lookup that will always miss.
export function isPickupOrder(o: OrderDto): boolean {
  return (o.orderType ?? "").toLowerCase() === "pickup";
}
