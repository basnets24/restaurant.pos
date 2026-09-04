import type { OrderDto } from "./types";

// "Fired to the kitchen and not yet delivered" - the set ActiveOrdersPage and
// the nav badge counts show. Pending excludes Paid/Cancelled/Rejected; !servedAt
// excludes orders the kitchen already marked delivered (see Order.ServedAt).
export function isActiveKitchenOrder(o: OrderDto): boolean {
  return (o.status ?? "").toLowerCase() === "pending" && !o.servedAt;
}
