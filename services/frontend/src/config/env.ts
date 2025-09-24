// src/config/env.ts
declare global {
    interface Window {
        // Global URLs provided by public/config.js at runtime
        IDENTITY_SERVICE_URL?: string;
        TENANT_SERVICE_URL?: string;
        CATALOG_SERVICE_URL?: string;
        INVENTORY_SERVICE_URL?: string;
        ORDER_SERVICE_URL?: string;
        PAYMENT_SERVICE_URL?: string;
        RABBITMQ_URL?: string;
    }
}

const must = (v: string | undefined, name: string) => {
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
};

export const ENV = {
    IDENTITY_URL: must(w.identityUrl ?? import.meta.env.VITE_IDENTITY_URL, "VITE_IDENTITY_URL"),
    TENANT_URL: must((w as any).tenantUrl ?? import.meta.env.VITE_TENANT_URL, "VITE_TENANT_URL"),
    CATALOG_URL: must(w.catalogUrl ?? import.meta.env.VITE_CATALOG_URL, "VITE_CATALOG_URL"),
    INVENTORY_URL: must(w.inventoryUrl ?? import.meta.env.VITE_INVENTORY_URL, "VITE_INVENTORY_URL"),
    ORDER_URL: must(w.orderUrl ?? import.meta.env.VITE_ORDER_URL, "VITE_ORDER_URL"),
    PAYMENT_URL: must(w.paymentUrl ?? import.meta.env.VITE_PAYMENT_URL, "VITE_PAYMENT_URL"),
    RABBITMQ_URL: must(w.rabbitmqUrl ?? import.meta.env.VITE_RABBITMQ_URL, "VITE_RABBITMQ_URL"),
} as const;

