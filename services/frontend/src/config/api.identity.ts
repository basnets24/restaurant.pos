import { ENV } from "./env.ts";

const base = `${ENV.IDENTITY_URL}/users`;


const qs = (q?: Record<string, string | number | undefined | null>) => {
    if (!q) return "";
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) {
        if (v !== undefined && v !== null && String(v).trim() !== "") p.set(k, String(v));
    }
    const s = p.toString();
    return s ? `?${s}` : "";
};


export const IdentityAPI = {
    users: {
        base,
        me: `${base}/me`,
        list: (q?: { username?: string; role?: string; page?: number; pageSize?: number }) => `${base}${qs(q)}`,
        byId: (id: string) => `${base}/${id}`,
        roles: {
            list: (id: string) => `${base}/${id}/roles`,
            add: (id: string) => `${base}/${id}/roles`,
            remove: (id: string, role: string) => `${base}/${id}/roles/${encodeURIComponent(role)}`,
            all: `${base}/roles`,
        },
    },
} as const;