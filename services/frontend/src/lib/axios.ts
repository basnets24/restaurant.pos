import axios from "axios";

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    withCredentials: false, // keep if your backend sets cookies; otherwise remove
});
