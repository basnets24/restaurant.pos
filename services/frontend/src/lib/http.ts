import axios from "axios";
import { AuthorizationPaths } from "../api-authorization/ApiAuthorizationConstants";

export const http = axios.create();

http.interceptors.request.use((config) => {
    const token = window.POS_SHELL_AUTH?.getToken?.();
    if (token) config.headers.Authorization = `Bearer ${token}`;
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
