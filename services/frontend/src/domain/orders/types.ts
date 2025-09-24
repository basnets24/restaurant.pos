// src/features/pos/order/types.ts

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

    items: OrderItem[];
    status: OrderStatus;
    createdAt: string;

    // Pricing details (exact shapes come from Pricing types server-side)
    appliedDiscounts: any[];
    appliedTaxes: any[];
    serviceCharges: any[];

    tipAmount?: number | null;
    subtotal: number;
    discountTotal: number;
    serviceChargeTotal: number;
    taxTotal: number;
    grandTotal: number;

    receiptUrl?: string | null;
    paidAt?: string | null;
}

export interface TenantHeaders {
    restaurantId?: string;
    locationId?: string;
}

export interface PageResult<T> {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
}
