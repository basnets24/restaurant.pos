import type {
    AddCartItemDto,
    CartDto,
    CheckoutResponse,
    CreateCartDto,
    TenantHeaders,
} from './types';
import { ENV } from '@/config/env';
import { http } from '@/lib/http'; // your shared axios instance
import { getApiToken } from '@/auth/getApiToken';

const BASE = ENV.ORDER_URL; // e.g. https://localhost:7288

function withTenantHeaders(tenant?: TenantHeaders) {
    const headers: Record<string, string> = {};
    if (tenant?.restaurantId) headers['x-restaurant-id'] = tenant.restaurantId;
    if (tenant?.locationId) headers['x-location-id'] = tenant.locationId;
    return headers;
}

export async function createCart(payload: CreateCartDto, tenant?: TenantHeaders) {
    const token = await getApiToken('Order', ['order.write']);
    const { data } = await http.post<CartDto>(`${BASE}/carts`, payload, {
        headers: { ...withTenantHeaders(tenant), Authorization: `Bearer ${token}` },
    });
    return data;
}

export async function getCart(id: string, tenant?: TenantHeaders) {
    const token = await getApiToken('Order', ['order.read']);
    const { data } = await http.get<CartDto>(`${BASE}/carts/${id}`, {
        headers: { ...withTenantHeaders(tenant), Authorization: `Bearer ${token}` },
    });
    return data;
}

export async function addCartItem(id: string, payload: AddCartItemDto, tenant?: TenantHeaders) {
    const token = await getApiToken('Order', ['order.write']);
    await http.post<void>(`${BASE}/carts/${id}/items`, payload, {
        headers: { ...withTenantHeaders(tenant), Authorization: `Bearer ${token}` },
    });
}

export async function removeCartItem(id: string, menuItemId: string, tenant?: TenantHeaders) {
    const token = await getApiToken('Order', ['order.write']);
    await http.delete<void>(`${BASE}/carts/${id}/items/${menuItemId}`, {
        headers: { ...withTenantHeaders(tenant), Authorization: `Bearer ${token}` },
    });
}

export async function checkoutCart(id: string, tenant?: TenantHeaders) {
    const token = await getApiToken('Order', ['order.write', 'payment.charge']);
    const { data } = await http.post<CheckoutResponse>(`${BASE}/carts/${id}/checkout`, null, {
        headers: { ...withTenantHeaders(tenant), Authorization: `Bearer ${token}` },
    });
    return data;
}
