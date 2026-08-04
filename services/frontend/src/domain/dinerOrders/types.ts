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

export interface DinerOrderItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
  selectedModifiers: { groupName: string; optionName: string; priceDelta: number }[];
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
