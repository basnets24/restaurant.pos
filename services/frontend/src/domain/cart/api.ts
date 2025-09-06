import type {
    AddCartItemDto,
    CartDto,
    CheckoutResponse,
    CreateCartDto,
    TenantHeaders,
} from './types';
import { ENV } from '@/config/env';
import { http } from '@/lib/http'; // your shared axios instance

const BASE = ENV.ORDER_URL; // e.g. https://localhost:7288

function withTenantHeaders(tenant?: TenantHeaders) {
    const headers: Record<string, string> = {};
    if (tenant?.restaurantId) headers['x-restaurant-id'] = tenant.restaurantId;
    if (tenant?.locationId) headers['x-location-id'] = tenant.locationId;
    return headers;
}

export async function createCart(payload: CreateCartDto, tenant?: TenantHeaders) {
    const { data } = await http.post<CartDto>(`${BASE}/carts`, payload, {
        headers: withTenantHeaders(tenant),
    });
    return data;
}

export async function getCart(id: string, tenant?: TenantHeaders) {
    const { data } = await http.get<CartDto>(`${BASE}/carts/${id}`, {
        headers: withTenantHeaders(tenant),
    });
    return data;
}

export async function addCartItem(id: string, payload: AddCartItemDto, tenant?: TenantHeaders) {
    await http.post<void>(`${BASE}/carts/${id}/items`, payload, {
        headers: withTenantHeaders(tenant),
    });
}

export async function removeCartItem(id: string, menuItemId: string, tenant?: TenantHeaders) {
    await http.delete<void>(`${BASE}/carts/${id}/items/${menuItemId}`, {
        headers: withTenantHeaders(tenant),
    });
}

export async function checkoutCart(id: string, tenant?: TenantHeaders) {
    const { data } = await http.post<CheckoutResponse>(`${BASE}/carts/${id}/checkout`, null, {
        headers: withTenantHeaders(tenant),
    });
    return data;
}
