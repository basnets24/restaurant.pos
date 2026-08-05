/**
 * Something that happened to one of the diner's orders.
 *
 * Carries its own restaurant, like `DinerOrderSummary` and unlike every other diner response:
 * the list spans restaurants, so the tenant cannot be implied by whichever one the diner
 * happens to be browsing.
 */
export interface DinerNotification {
  id: string;
  orderId: string;
  restaurantId: string;
  locationId: string;
  /** Snapshotted when the order was placed. Null if it couldn't be resolved then. */
  restaurantName?: string | null;
  /** See `CustomerNotificationType` on the server. */
  type: string;
  title: string;
  message?: string | null;
  createdAt: string;
  /** Null means unread — that's what the badge counts. */
  readAt?: string | null;
}
