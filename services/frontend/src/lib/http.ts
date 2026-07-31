import axios from "axios";
import { tokenAccessor } from "@/auth/runtime";
import type { TenantClaims } from "@/auth/types";

export const http = axios.create();

http.interceptors.request.use((config) => {
    const token = tokenAccessor();
    // Respect per-request Authorization header if already set (e.g., audience/scoped tokens).
    const hasAuthHeader = !!config.headers.get("Authorization");
    if (token && !hasAuthHeader) {
        config.headers.set("Authorization", `Bearer ${token}`);
    }
    // Try to infer multi-tenant headers from JWT claims if not explicitly provided
    try {
        if (token) {
            const [, payload] = token.split(".");
            if (payload) {
                const toBase64 = (s: string) => s.replace(/-/g, "+").replace(/_/g, "/");
                const pad = (s: string) => s + "===".slice(((s.length + 3) % 4));
                const json = JSON.parse(atob(pad(toBase64(payload)))) as TenantClaims;
                const rid = json.restaurant_id ?? json.restaurantId;
                const lid = json.location_id ?? json.locationId;
                if (rid && !config.headers.get("x-restaurant-id")) config.headers.set("x-restaurant-id", rid);
                if (lid && !config.headers.get("x-location-id")) config.headers.set("x-location-id", lid);
            }
        }
    } catch (e) {
        // ignore token parse errors; header attachment is best-effort
        console.warn("http: failed to infer tenant headers from JWT", e);
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
