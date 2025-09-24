export const API_BASE =
    import.meta.env.VITE_API_BASE ??
    (window as any)?.ORDER_SERVICE_URL ??
    "http://localhost:7288";

import { tokenAccessor } from "@/auth/runtime";
export const getToken = () => tokenAccessor() ?? localStorage.getItem("token") ?? "";
