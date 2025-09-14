// src/features/pos/order/key.ts
export const orderKeys = {
    all: ["orders"] as const,
    list: () => [...orderKeys.all, "list"] as const,
    byId: (id: string) => [...orderKeys.all, "by-id", id] as const,
};
