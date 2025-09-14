// src/features/pos/order/hook.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import { orderKeys } from "./keys";
import type { FinalizeOrderDto, TenantHeaders } from "./types";

export function useOrders(tenant?: TenantHeaders) {
    return useQuery({
        queryKey: orderKeys.list(),
        queryFn: () => api.listOrders(tenant),
        staleTime: 15_000,
    });
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
