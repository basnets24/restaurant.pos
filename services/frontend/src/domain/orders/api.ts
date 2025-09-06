// src/features/pos/order/api.ts
import { ENV } from "@/config/env";
import { http } from "@/lib/http";
import type { FinalizeOrderDto, OrderDto, TenantHeaders } from "./types";

const BASE = ENV.ORDER_URL; // e.g. https://localhost:7288

function withTenantHeaders(tenant?: TenantHeaders) {
    const headers: Record<string, string> = {};
    if (tenant?.restaurantId) headers["x-restaurant-id"] = tenant.restaurantId;
    if (tenant?.locationId) headers["x-location-id"] = tenant.locationId;
    return headers;
}

export async function listOrders(tenant?: TenantHeaders) {
    const { data } = await http.get<OrderDto[]>(`${BASE}/orders`, {
        headers: withTenantHeaders(tenant),
    });
    return data;
}

export async function getOrder(id: string, tenant?: TenantHeaders) {
    const { data } = await http.get<OrderDto>(`${BASE}/orders/${id}`, {
        headers: withTenantHeaders(tenant),
    });
    return data;
}

export async function finalizeOrder(
    body: FinalizeOrderDto,
    opts?: { idempotencyKey?: string; tenant?: TenantHeaders }
) {
    const params = new URLSearchParams();
    if (opts?.idempotencyKey) params.set("idempotencyKey", opts.idempotencyKey);

    const { data } = await http.post<OrderDto>(`${BASE}/orders?${params.toString()}`, body, {
        headers: withTenantHeaders(opts?.tenant),
    });
    return data;
}
