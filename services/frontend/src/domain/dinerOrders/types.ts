/** Tenant a diner request applies to. Taken from the listing the diner chose, never inferred
 *  from a token - a diner token carries no tenant claims at all. */
export interface DinerTenant {
  restaurantId: string;
  locationId: string;
}

export interface DinerCheckoutLine {
  menuItemId: string;
  quantity: number;
  notes?: string;
  /** Option ids only. Names and prices are resolved server-side against catalog. */
  optionIds: string[];
}

export interface DinerCheckoutRequest {
  cartId: string;
  pickupTime?: string | null;
  items: DinerCheckoutLine[];
}

export interface DinerCheckoutResult {
  orderId: string;
  grandTotal: number;
  status: string;
}

export interface AppliedLineDto {
  id: string;
  name: string;
  amount: number | null;
}

/** Server-computed money for a cart. Render these numbers; never recompute tax client-side. */
export interface DinerEstimate {
  subtotal: number;
  discountTotal: number;
  serviceChargeTotal: number;
  taxTotal: number;
  grandTotal: number;
  appliedDiscounts: AppliedLineDto[];
  serviceCharges: AppliedLineDto[];
  appliedTaxes: AppliedLineDto[];
}

/** Stripe session for an order. `clientSecret` is absent until the PaymentIntent exists, which
 *  happens a broker round trip after inventory is reserved - so "pending" is the normal first
 *  answer, not an error. */
export interface DinerPaymentSession {
  clientSecret?: string | null;
  status?: string;
}

export interface DinerPaymentConfirm {
  status: string;
  receiptUrl?: string | null;
  error?: string;
}

export interface DinerOrderItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
  selectedModifiers: { groupName: string; optionName: string; priceDelta: number }[];
}

/**
 * One row of cross-restaurant order history. Carries the restaurant it was placed at, which
 * `DinerOrder` does not: everywhere else the restaurant is whichever one the diner is browsing,
 * and here it is the thing that varies from row to row.
 *
 * `restaurantName` is a snapshot taken when the order was placed, so it survives a restaurant
 * leaving discovery. It is null only if the name couldn't be resolved at that moment.
 */
export interface DinerOrderSummary {
  orderId: string;
  restaurantId: string;
  locationId: string;
  restaurantName?: string | null;
  locationName?: string | null;
  status: string;
  orderType: string;
  grandTotal: number;
  itemCount: number;
  /** Pre-rendered line summary ("2x House Fries, 1x Olive Oil Cake"). Display as-is. */
  itemSummary: string;
  createdAt: string;
  pickupTime?: string | null;
  paidAt?: string | null;
  cancelledAt?: string | null;
}

export interface DinerOrder {
  id: string;
  status: string;
  orderType: string;
  pickupTime?: string | null;
  createdAt: string;
  items: DinerOrderItem[];
  subtotal: number;
  discountTotal: number;
  serviceChargeTotal: number;
  taxTotal: number;
  grandTotal: number;
  paidAt?: string | null;
}
