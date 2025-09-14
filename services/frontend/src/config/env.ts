// src/config/env.ts
declare global {
    interface Window {
        POS_SHELL_CONFIG?: {
            identityUrl?: string;
            catalogUrl?: string;
            inventoryUrl?: string;
            orderUrl?: string;
            paymentUrl?: string;
            rabbitmqUrl?: string;
        };
        POS_SHELL_AUTH?: { getToken?: () => string | undefined; getTenant?: () => { restaurantId?: string; locationId?: string } | undefined };
    }
}

const must = (v: string | undefined, name: string) => {
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
};

const w = window.POS_SHELL_CONFIG ?? {};

export const ENV = {
    IDENTITY_URL:  must(w.identityUrl  ?? import.meta.env.VITE_IDENTITY_URL,  "VITE_IDENTITY_URL"),
    TENANT_URL:    must((w as any).tenantUrl ?? import.meta.env.VITE_TENANT_URL, "VITE_TENANT_URL"),
    CATALOG_URL:   must(w.catalogUrl   ?? import.meta.env.VITE_CATALOG_URL,   "VITE_CATALOG_URL"),
    INVENTORY_URL: must(w.inventoryUrl ?? import.meta.env.VITE_INVENTORY_URL, "VITE_INVENTORY_URL"),
    ORDER_URL:     must(w.orderUrl     ?? import.meta.env.VITE_ORDER_URL,     "VITE_ORDER_URL"),
    PAYMENT_URL:   must(w.paymentUrl   ?? import.meta.env.VITE_PAYMENT_URL,   "VITE_PAYMENT_URL"),
    RABBITMQ_URL:  must(w.rabbitmqUrl  ?? import.meta.env.VITE_RABBITMQ_URL,  "VITE_RABBITMQ_URL"),
} as const;

export const getToken = (): string | undefined =>
    window.POS_SHELL_AUTH?.getToken?.() ?? undefined;
