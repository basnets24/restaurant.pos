import { useEffect, useRef, useState, useCallback } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import type { HubConnection } from "@microsoft/signalr";
import type { Table } from "../types/tables";
import { API_BASE, getToken } from "../lib/config";
import { fetchTables, setStatus, seatParty, saveLayout } from "../api/table";

export function useTables() {
    const [tables, setTables] = useState<Table[]>([]);
    const connRef = useRef<HubConnection | null>(null);
    const tenant = (window as any)?.POS_SHELL_AUTH?.getTenant?.();

    // Only load tables after tenant context is available
    useEffect(() => {
        if (!tenant?.restaurantId) return;
        fetchTables().then(setTables).catch(console.error);
    }, [tenant?.restaurantId]);

    useEffect(() => {
        if (!tenant?.restaurantId) return;

        const params = new URLSearchParams();
        params.set("restaurantId", tenant.restaurantId);
        if (tenant.locationId) params.set("locationId", tenant.locationId);

        const c = new HubConnectionBuilder()
            .withUrl(`${API_BASE}/hubs/floor?${params.toString()}`, { accessTokenFactory: () => getToken(), withCredentials: true })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.Warning)
            .build();

        c.on("TableStatusChanged", ({ tableId, status, partySize }) => {
            setTables(prev => prev.map(t => t.id === String(tableId) ? { ...t, status, partySize: partySize ?? undefined } : t));
        });

        c.on("TableLayoutChanged", ({ tableId, x, y, width, height, version, shape }) => {
            setTables(prev => prev.map(t => t.id === String(tableId)
                ? { ...t, position: { x, y }, size: { width: width ?? t.size.width, height: height ?? t.size.height }, version, shape: shape ?? t.shape }
                : t));
        });

        c.on("OrderLinked", ({ tableId, orderId }) => {
            setTables(prev => prev.map(t => t.id === String(tableId) ? { ...t, activeCartId: String(orderId) } : t));
        });

        c.on("OrderUnlinked", ({ tableId }) => {
            setTables(prev => prev.map(t => t.id === String(tableId) ? { ...t, activeCartId: null } : t));
        });

        c.start().catch(console.error);
        connRef.current = c;
        return () => { c.stop().catch(() => {}); connRef.current = null; };
    }, [tenant?.restaurantId, tenant?.locationId]);

    const updateStatus = useCallback(async (id: string, status: Table["status"], partySize?: number) => {
        await setStatus(id, status, partySize);
        setTables(prev => prev.map(t => t.id === id ? { ...t, status, partySize: status === "available" ? undefined : partySize } : t));
    }, []);

    const seat = useCallback(async (id: string, size: number) => {
        await seatParty(id, size);
        setTables(prev => prev.map(t => t.id === id ? { ...t, status: "occupied", partySize: size } : t));
    }, []);

    const persistMove = useCallback(async (changed: Table) => {
        try {
            await saveLayout(changed.id, {
                x: changed.position.x, y: changed.position.y,
                width: changed.size.width, height: changed.size.height,
                rotation: 0, shape: changed.shape, version: changed.version,
            });
            setTables(prev => prev.map(t => t.id === changed.id ? { ...t, version: t.version + 1 } : t));
        } catch (e: any) {
            if (e.message === "version-conflict") {
                const fresh = await fetchTables();
                setTables(fresh);
            } else { throw e; }
        }
    }, []);

    return { tables, setTables, updateStatus, seat, persistMove };
}
