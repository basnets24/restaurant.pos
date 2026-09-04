// src/features/pos/order/hook.ts
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import { orderKeys } from "./keys";
import { isActiveKitchenOrder } from "./utils";
import type { FinalizeOrderDto, OrderDto, TenantHeaders } from "./types";

export function useOrders(tenant?: TenantHeaders) {
    return useQuery({
        queryKey: orderKeys.list(),
        queryFn: () => api.listOrders(tenant),
        staleTime: 15_000,
    });
}

// Fired-but-not-yet-served orders, server-wide - what the kitchen still owes
// the floor, regardless of which terminal fired each one. Replaces the old
// per-terminal `kitchen.active()` (local ticket list only) as the source for
// ActiveOrdersPage and the nav badge counts.
export function useActiveOrders(tenant?: TenantHeaders) {
    const ordersQuery = useOrders(tenant);
    const active = useMemo(
        () =>
            (ordersQuery.data?.items ?? [])
                .filter(isActiveKitchenOrder)
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        [ordersQuery.data]
    );
    return { data: active as OrderDto[], isLoading: ordersQuery.isLoading, isError: ordersQuery.isError };
}

export function useOrder(id?: string, tenant?: TenantHeaders) {
    return useQuery({
        queryKey: id ? orderKeys.byId(id) : orderKeys.all,
        queryFn: () => {
            if (!id) throw new Error("order id is required");
            return api.getOrder(id, tenant);
        },
        enabled: !!id,
        staleTime: 15_000,
    });
}

// "Has this cart been fired?" as a query, not an assumption - a cart with no
// order yet resolves to `data: null`, not an error, so callers can enable
// this unconditionally instead of gating it behind their own guess.
export function useOrderIfExists(id?: string, tenant?: TenantHeaders) {
    return useQuery({
        // Distinct from useOrder's orderKeys.byId(id) - that key's cached value is
        // always a real OrderDto (throws on 404), this one's is OrderDto | null.
        // Sharing a key between the two would let whichever query last settled
        // silently overwrite the other's cached shape.
        queryKey: id ? [...orderKeys.byId(id), "if-exists"] : orderKeys.all,
        queryFn: () => {
            if (!id) throw new Error("order id is required");
            return api.getOrderOrNull(id, tenant);
        },
        enabled: !!id,
        staleTime: 10_000,
        retry: false,
    });
}

export function useMarkServed(opts?: { tenant?: TenantHeaders }) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (orderId: string) => api.markOrderServed(orderId, opts?.tenant),
        onSuccess: (_data, orderId) => {
            qc.invalidateQueries({ queryKey: orderKeys.byId(orderId) });
            qc.invalidateQueries({ queryKey: orderKeys.list() });
        },
    });
}

export function useFinalizeOrder(opts?: { tenant?: TenantHeaders }) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { body: FinalizeOrderDto; idempotencyKey?: string }) =>
            api.finalizeOrder(args.body, { idempotencyKey: args.idempotencyKey, tenant: opts?.tenant }),
        onSuccess: (order) => {
            qc.invalidateQueries({ queryKey: orderKeys.list() });
            qc.setQueryData(orderKeys.byId(order.id), order);
        },
    });
}

export function useRequestPayment(opts?: { tenant?: TenantHeaders }) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (orderId: string) => api.requestPayment(orderId, opts?.tenant),
        onSuccess: (_data, orderId) => {
            qc.invalidateQueries({ queryKey: orderKeys.byId(orderId) });
        },
    });
}

export function useCancelOrder(opts?: { tenant?: TenantHeaders }) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (orderId: string) => api.cancelOrder(orderId, opts?.tenant),
        onSuccess: (_data, orderId) => {
            qc.invalidateQueries({ queryKey: orderKeys.byId(orderId) });
            qc.invalidateQueries({ queryKey: orderKeys.list() });
        },
    });
}
