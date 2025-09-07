import type { Table } from "../types/tables";
import { API_BASE, getToken } from "../lib/config";

const h = () => {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
    };
    const tenant = (window as any)?.POS_SHELL_AUTH?.getTenant?.();
    if (tenant?.restaurantId) headers["x-restaurant-id"] = tenant.restaurantId;
    if (tenant?.locationId) headers["x-location-id"] = tenant.locationId;
    return headers;
};

export async function fetchTables(): Promise<Table[]> {
    const r = await fetch(`${API_BASE}/tables/layout`, { headers: h() });
    if (!r.ok) throw new Error(`fetchTables ${r.status}`);
    const data = await r.json();
    return data.map((t: any) => ({
        id: t.id,
        number: t.number,
        section: t.section,
        seats: t.seats,
        shape: t.shape,
        status: t.status, // already lower-case from service
        position: { x: t.position.x, y: t.position.y },
        size: { width: t.size.width, height: t.size.height },
        partySize: t.partySize ?? undefined,
        version: t.version ?? 0,
        activeCartId: t.activeCartId ?? null,
        serverId: t.serverId ?? null,
    })) as Table[];
}

export async function setStatus(id: string, status: Table["status"], partySize?: number) {
    const r = await fetch(`${API_BASE}/tables/${id}/status`, {
        method: "PATCH", headers: h(), body: JSON.stringify({ status, partySize }),
    });
    if (!r.ok) throw new Error(`setStatus ${r.status}`);
}

export async function seatParty(id: string, size: number) {
    const r = await fetch(`${API_BASE}/tables/${id}/seat`, {
        method: "POST", headers: h(), body: JSON.stringify({ partySize: size }),
    });
    if (!r.ok) throw new Error(`seatParty ${r.status}`);
}

export async function saveLayout(id: string, p: {
    x: number; y: number; width?: number; height?: number; rotation?: number; shape: string; version: number;
}) {
    const r = await fetch(`${API_BASE}/tables/${id}/layout`, {
        method: "PATCH", headers: h(),
        body: JSON.stringify({ x: p.x, y: p.y, width: p.width, height: p.height, rotation: p.rotation ?? 0, shape: p.shape, version: p.version }),
    });
    if (!r.ok) {
        if (r.status === 409) throw new Error("version-conflict");
        throw new Error(`saveLayout ${r.status}`);
    }
}
