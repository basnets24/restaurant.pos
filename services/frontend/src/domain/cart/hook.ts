import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartKeys } from './keys';
import * as api from './api';
import type { AddCartItemDto, CreateCartDto, TenantHeaders } from './types';

// Read a cart
export function useCart(id?: string, tenant?: TenantHeaders) {
    return useQuery({
        queryKey: id ? cartKeys.byId(id) : cartKeys.all,
        queryFn: () => {
            if (!id) throw new Error('cart id is required');
            return api.getCart(id, tenant);
        },
        enabled: !!id,
        staleTime: 15_000,
    });
}

// Create a cart
export function useCreateCart(tenant?: TenantHeaders) {
    return useMutation({
        mutationFn: (payload: CreateCartDto) => api.createCart(payload, tenant),
    });
}

// Add item -> refetch cart
export function useAddCartItem(id: string, tenant?: TenantHeaders) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: AddCartItemDto) => api.addCartItem(id, payload, tenant),
        onSuccess: () => qc.invalidateQueries({ queryKey: cartKeys.byId(id) }),
    });
}

// Remove item -> refetch cart
export function useRemoveCartItem(id: string, tenant?: TenantHeaders) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (menuItemId: string) => api.removeCartItem(id, menuItemId, tenant),
        onSuccess: () => qc.invalidateQueries({ queryKey: cartKeys.byId(id) }),
    });
}

// Checkout -> optionally you can clear cache or redirect after success
export function useCheckoutCart(id: string, tenant?: TenantHeaders) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => api.checkoutCart(id, tenant),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: cartKeys.byId(id) });
        },
    });
}
