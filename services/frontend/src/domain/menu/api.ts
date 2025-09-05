import { ENV } from "@/config/env";

const base = `${ENV.CATALOG_URL}/menu-items`;

export const MenuAPI = {
  list: (q?: { name?: string; category?: string; available?: boolean; page?: number; pageSize?: number }) => {
    const p = new URLSearchParams();
    if (q?.name) p.set("name", q.name);
    if (q?.category) p.set("category", q.category);
    if (q?.available !== undefined) p.set("available", String(q.available));
    if (q?.page) p.set("page", String(q.page));
    if (q?.pageSize) p.set("pageSize", String(q.pageSize));
    const qs = p.toString();
    return `${base}${qs ? `?${qs}` : ""}`;
  },
  byId: (id: string) => `${base}/${id}`,
  categories: `${base}/categories`,
  create: base,
  patch: (id: string) => `${base}/${id}`,
  remove: (id: string) => `${base}/${id}`,
  availability: (id: string) => `${base}/${id}:availability`,
} as const;

