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

// Pricing detail objects mirror OrderService.Pricing.Contracts.cs records.
export interface AppliedDiscount {
    id: string;
    name: string;
    percent?: number | null;
    amount?: number | null;
    scope: string; // "Line" | "Order"
}

export interface ServiceCharge {
    id: string;
    name: string;
    percent?: number | null;
    amount?: number | null;
    taxable: boolean;
    scope: string; // "Line" | "Order"
}

export interface AppliedTax {
    id: string;
    name: string;
    ratePercent?: number | null;
    amount?: number | null;
    scope: string; // "Line" | "Order"
}

export interface CartEstimateDto {
    subtotal: number;
    discountTotal: number;
    serviceChargeTotal: number;
    taxTotal: number;
    grandTotal: number;
    appliedDiscounts: AppliedDiscount[];
    serviceCharges: ServiceCharge[];
    appliedTaxes: AppliedTax[];
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
export type { TenantHeaders } from "@/auth/tenantHeaders";
