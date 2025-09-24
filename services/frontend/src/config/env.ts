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
    IDENTITY_URL: must(window.IDENTITY_SERVICE_URL ?? import.meta.env.VITE_IDENTITY_URL, "IDENTITY_SERVICE_URL|VITE_IDENTITY_URL"),
    TENANT_URL: must(window.TENANT_SERVICE_URL ?? import.meta.env.VITE_TENANT_URL, "TENANT_SERVICE_URL|VITE_TENANT_URL"),
    CATALOG_URL: must(window.CATALOG_SERVICE_URL ?? import.meta.env.VITE_CATALOG_URL, "CATALOG_SERVICE_URL|VITE_CATALOG_URL"),
    INVENTORY_URL: must(window.INVENTORY_SERVICE_URL ?? import.meta.env.VITE_INVENTORY_URL, "INVENTORY_SERVICE_URL|VITE_INVENTORY_URL"),
    ORDER_URL: must(window.ORDER_SERVICE_URL ?? import.meta.env.VITE_ORDER_URL, "ORDER_SERVICE_URL|VITE_ORDER_URL"),
    PAYMENT_URL: must(window.PAYMENT_SERVICE_URL ?? import.meta.env.VITE_PAYMENT_URL, "PAYMENT_SERVICE_URL|VITE_PAYMENT_URL"),
    RABBITMQ_URL: must(window.RABBITMQ_URL ?? import.meta.env.VITE_RABBITMQ_URL, "RABBITMQ_URL|VITE_RABBITMQ_URL"),
} as const;

