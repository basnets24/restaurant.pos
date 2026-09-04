// src/features/pos/order/types.ts

import type { AppliedDiscount, AppliedTax, ServiceCharge } from "@/domain/cart/types";

export type OrderStatus = "Pending" | "Paid" | string;

export interface OrderItem {
    menuItemId: string;        // Guid on server
    menuItemName: string;
    quantity: number;
    unitPrice: number;
    notes?: string | null;
}

// Body for POST /orders
export interface FinalizeOrderDto {
    tableId?: string | null;
    serverId?: string | null;
    serverName?: string | null;
    guestCount?: number | null;
    tipAmount?: number | null;
    items: OrderItem[];
    subtotal: number;
}

// Returned by GET/POST /orders
export interface OrderDto {
    id: string;

    tableId?: string | null;
    serverId?: string | null;
    serverName?: string | null;
    guestCount?: number | null;
    // "DineIn" | "Pickup" (OrderService.Entities.OrderTypes) - a Pickup order
    // has no tableId by design, not as an error state. See isPickupOrder.
    orderType?: string;

    items: OrderItem[];
    status: OrderStatus;
    createdAt: string;

    // Pricing details — mirror OrderService.Pricing.Contracts.cs records (see domain/cart/types.ts)
    appliedDiscounts: AppliedDiscount[];
    appliedTaxes: AppliedTax[];
    serviceCharges: ServiceCharge[];

    tipAmount?: number | null;
    subtotal: number;
    discountTotal: number;
    serviceChargeTotal: number;
    taxTotal: number;
    grandTotal: number;

    receiptUrl?: string | null;
    paidAt?: string | null;
    lastPaymentError?: string | null;
    lastPaymentFailedAt?: string | null;
    servedAt?: string | null;
}

export type { TenantHeaders } from "@/auth/tenantHeaders";

export interface PageResult<T> {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
}
