// src/features/pos/order/api.ts
import { ENV } from "@/config/env";
import { http } from "@/lib/http";
import { getApiToken } from "@/auth/getApiToken";
import { withTenantHeaders } from "@/auth/tenantHeaders";
import { errorStatus, toApiError } from "@/lib/apiErrors";
import type { FinalizeOrderDto, OrderDto, TenantHeaders, PageResult } from "./types";

const BASE = ENV.ORDER_URL; // e.g. https://localhost:7288

export async function listOrders(tenant?: TenantHeaders): Promise<PageResult<OrderDto>> {
    try {
        const token = await getApiToken('Order', ['order.read']);
        const { data } = await http.get(`${BASE}/orders`, {
            headers: { ...withTenantHeaders(tenant), Authorization: `Bearer ${token}` },
        });
        if (Array.isArray(data)) {
            const items = data as OrderDto[];
            return { items, page: 1, pageSize: items.length, total: items.length };
        }
        return data as PageResult<OrderDto>;
    } catch (e) { throw toApiError(e); }
}

export async function getOrder(id: string, tenant?: TenantHeaders) {
    try {
        const token = await getApiToken('Order', ['order.read']);
        const { data } = await http.get<OrderDto>(`${BASE}/orders/${id}`, {
            headers: { ...withTenantHeaders(tenant), Authorization: `Bearer ${token}` },
        });
        return data;
    } catch (e) { throw toApiError(e); }
}

// Like getOrder, but a 404 (no order fired yet for this id) resolves to null
// instead of throwing - callers use this to ask "has this been fired?"
// unconditionally, without treating "not yet" as a query error.
export async function getOrderOrNull(id: string, tenant?: TenantHeaders): Promise<OrderDto | null> {
    try {
        return await getOrder(id, tenant);
    } catch (e) {
        if (errorStatus(e) === 404) return null;
        throw e;
    }
}

export async function markOrderServed(orderId: string, tenant?: TenantHeaders): Promise<void> {
    try {
        const token = await getApiToken('Order', ['order.write']);
        await http.post(`${BASE}/orders/${orderId}/serve`, null, {
            headers: { ...withTenantHeaders(tenant), Authorization: `Bearer ${token}` },
        });
    } catch (e) { throw toApiError(e); }
}

export async function finalizeOrder(
    body: FinalizeOrderDto,
    opts?: { idempotencyKey?: string; tenant?: TenantHeaders }
) {
    try {
        const params = new URLSearchParams();
        if (opts?.idempotencyKey) params.set("idempotencyKey", opts.idempotencyKey);

        const token = await getApiToken('Order', ['order.write']);
        const { data } = await http.post<OrderDto>(`${BASE}/orders?${params.toString()}`, body, {
            headers: { ...withTenantHeaders(opts?.tenant), Authorization: `Bearer ${token}` },
        });
        return data;
    } catch (e) { throw toApiError(e); }
}

export async function requestPayment(orderId: string, tenant?: TenantHeaders) {
    try {
        const token = await getApiToken('Order', ['order.write']);
        await http.post(`${BASE}/orders/${orderId}/request-payment`, null, {
            headers: { ...withTenantHeaders(tenant), Authorization: `Bearer ${token}` },
        });
    } catch (e) { throw toApiError(e); }
}

export async function cancelOrder(orderId: string, tenant?: TenantHeaders) {
    try {
        const token = await getApiToken('Order', ['order.write']);
        await http.post(`${BASE}/orders/${orderId}/cancel`, null, {
            headers: { ...withTenantHeaders(tenant), Authorization: `Bearer ${token}` },
        });
    } catch (e) { throw toApiError(e); }
}
