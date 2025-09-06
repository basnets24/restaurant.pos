// Back-end uses System.Text.Json (camelCase on the wire).
// Shapes mirrored from CartDtos.cs.

export interface CreateCartDto {
    tableId?: string | null;
    customerId?: string | null;
    guestCount?: number | null;
}

export interface AddCartItemDto {
    menuItemId: string;
    quantity: number;
    notes?: string | null;
}

export interface CartItemDto {
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    unitPrice: number;
    notes?: string | null;
}

// Pricing detail objects come from OrderService.Pricing.*.
// If you have their exact shapes, replace the `any` types below.
export interface CartEstimateDto {
    subtotal: number;
    discountTotal: number;
    serviceChargeTotal: number;
    taxTotal: number;
    grandTotal: number;
    appliedDiscounts: any[];
    serviceCharges: any[];
    appliedTaxes: any[];
}

export interface CartDto {
    id: string;
    tableId?: string | null;
    customerId?: string | null;
    serverId?: string | null;
    serverName?: string | null;
    guestCount?: number | null;
    items: CartItemDto[];
    createdAt: string; // ISO
    estimate?: CartEstimateDto | null;
}

export interface CheckoutResponse {
    orderId: string;
}

// Optional multi-tenant header values
export interface TenantHeaders {
    restaurantId?: string;
    locationId?: string;
}
