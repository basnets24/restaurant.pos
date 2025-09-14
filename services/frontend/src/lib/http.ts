import axios from "axios";
// Authorization paths import not needed; avoid unused import

export const http = axios.create();

http.interceptors.request.use((config) => {
    const token = window.POS_SHELL_AUTH?.getToken?.();
    // Respect per-request Authorization header if already set (e.g., audience/scoped tokens).
    const hasAuthHeader = !!(config.headers as any)?.Authorization;
    if (token && !hasAuthHeader) {
        (config.headers as any).Authorization = `Bearer ${token}`;
    }
    // Try to infer multi-tenant headers from JWT claims if not explicitly provided
    try {
        if (token) {
            const [, payload] = token.split(".");
            if (payload) {
                const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
                const rid = json["restaurant_id"] ?? json["restaurantId"];
                const lid = json["location_id"] ?? json["locationId"];
                if (rid && !(config.headers as any)["x-restaurant-id"]) (config.headers as any)["x-restaurant-id"] = rid as string;
                if (lid && !(config.headers as any)["x-location-id"]) (config.headers as any)["x-location-id"] = lid as string;
            }
        }
    } catch {
        // ignore token parse errors; header attachment is best-effort
    }
    return config;
});

http.interceptors.response.use(
    r => r,
    (err) => {
        // Do not force a global redirect on 401.
        // Let route guards (ProtectedRoute) and callers handle auth flows to avoid redirect loops.
        throw err;
    }
);
