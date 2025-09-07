import axios from "axios";
import { AuthorizationPaths } from "../api-authorization/ApiAuthorizationConstants";

export const http = axios.create();

http.interceptors.request.use((config) => {
    const token = window.POS_SHELL_AUTH?.getToken?.();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        // Try to infer multi-tenant headers from JWT claims if not explicitly provided
        try {
            const [, payload] = token.split(".");
            if (payload) {
                const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
                const rid = json["restaurant_id"] ?? json["restaurantId"];
                const lid = json["location_id"] ?? json["locationId"];
                if (rid && !(config.headers as any)["x-restaurant-id"]) (config.headers as any)["x-restaurant-id"] = rid as string;
                if (lid && !(config.headers as any)["x-location-id"]) (config.headers as any)["x-location-id"] = lid as string;
            }
        } catch {
            // ignore token parse errors; header attachment is best-effort
        }
    }
    return config;
});

http.interceptors.response.use(
    r => r,
    (err) => {
        if (err.response?.status === 401) {
            // configured auth route
            window.location.assign(AuthorizationPaths.Login);
            return;
        }
        throw err;
    }
);
