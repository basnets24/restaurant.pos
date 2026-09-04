import { useOrderIfExists } from "@/domain/orders/hooks";
import type { OrderDto } from "@/domain/orders/types";
import { useKitchen } from "./kitchenStore";

/**
 * Whether a cart has been fired to the kitchen - server truth (does an order
 * exist for this id?), not just this browser's local kitchen ticket list.
 * A different terminal firing the same order, or this terminal's localStorage
 * getting cleared, used to make MenuPage/OrderSideBar wrongly think an order
 * wasn't fired - see MenuPage's old `kitchen.isFired(cartId)`-only check.
 *
 * `kitchen.isFired` is still consulted as an instant fallback for the moment
 * right after *this* terminal fires an order, before the order query has had
 * a chance to refetch - without it the UI would flicker unlocked for a beat.
 */
export function useIsFired(cartId?: string | null): { isFired: boolean; order: OrderDto | null } {
  const kitchen = useKitchen();
  const orderQuery = useOrderIfExists(cartId ?? undefined);
  const order = orderQuery.data ?? null;
  const isFired = order != null || kitchen.isFired(cartId);
  return { isFired, order };
}
