// src/config/env.ts
declare global {
    interface Window {
        // Global URLs provided by public/config.js at runtime
        IDENTITY_SERVICE_URL?: string;
        CATALOG_SERVICE_URL?: string;
        ORDER_SERVICE_URL?: string;
        PAYMENT_SERVICE_URL?: string;
        RABBITMQ_URL?: string;
        STRIPE_PUBLISHABLE_KEY?: string;
        // Dev-only flag: set on window from the console to enable auth/getApiToken.ts's token logging
        AUTH_DEBUG?: boolean;
    }
}

const must = (v: string | undefined, name: string) => {
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
};

export const ENV = {
    IDENTITY_URL: must(window.IDENTITY_SERVICE_URL ?? import.meta.env.VITE_IDENTITY_URL, "VITE_IDENTITY_URL"),
    CATALOG_URL: must(window.CATALOG_SERVICE_URL ?? import.meta.env.VITE_CATALOG_URL, "VITE_CATALOG_URL"),
    ORDER_URL: must(window.ORDER_SERVICE_URL ?? import.meta.env.VITE_ORDER_URL, "VITE_ORDER_URL"),
    PAYMENT_URL: must(window.PAYMENT_SERVICE_URL ?? import.meta.env.VITE_PAYMENT_URL, "VITE_PAYMENT_URL"),
    RABBITMQ_URL: must(window.RABBITMQ_URL ?? import.meta.env.VITE_RABBITMQ_URL, "VITE_RABBITMQ_URL"),
    STRIPE_PUBLISHABLE_KEY: must(window.STRIPE_PUBLISHABLE_KEY ?? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY, "VITE_STRIPE_PUBLISHABLE_KEY"),
} as const;

