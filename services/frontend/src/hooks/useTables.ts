import { useEffect, useRef, useState, useCallback } from "react";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import type { HubConnection } from "@microsoft/signalr";
import type { TableViewDto as Table } from "@/domain/tables/types";
import { API_BASE, getToken } from "@/lib/config";
import { TablesApi } from "@/domain/tables/api";

export function useTables() {
    const [tables, setTables] = useState<Table[]>([]);
    const connRef = useRef<HubConnection | null>(null);
    const tenant = (window as any)?.POS_SHELL_AUTH?.getTenant?.();

    // Only load tables after tenant context is available
    useEffect(() => {
        if (!tenant?.restaurantId) return;
        TablesApi.getAll().then(setTables).catch(console.error);
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

        const onStatus = ({ tableId, status, partySize }: any) => {
            setTables(prev => prev.map(t => t.id === String(tableId) ? { ...t, status, partySize: partySize ?? undefined } : t));
        };
        const onLayout = ({ tableId, x, y, width, height, version, shape }: any) => {
            setTables(prev => prev.map(t => t.id === String(tableId)
                ? { ...t, position: { x, y }, size: { width: width ?? t.size.width, height: height ?? t.size.height }, version, shape: shape ?? t.shape }
                : t));
        };
        const onLinked = ({ tableId, orderId }: any) => {
            setTables(prev => prev.map(t => t.id === String(tableId) ? { ...t, activeCartId: String(orderId) } : t));
        };
        const onUnlinked = ({ tableId }: any) => {
            setTables(prev => prev.map(t => t.id === String(tableId) ? { ...t, activeCartId: null } : t));
        };

        c.on("TableStatusChanged", onStatus);
        c.on("TableLayoutChanged", onLayout);
        c.on("OrderLinked", onLinked);
        c.on("OrderUnlinked", onUnlinked);

        c.start().catch(console.error);
        connRef.current = c;
        return () => {
            try {
                c.off("TableStatusChanged", onStatus);
                c.off("TableLayoutChanged", onLayout);
                c.off("OrderLinked", onLinked);
                c.off("OrderUnlinked", onUnlinked);
            } finally {
                c.stop().catch(() => { });
                connRef.current = null;
            }
        };
    }, [tenant?.restaurantId, tenant?.locationId]);

    const updateStatus = useCallback(async (id: string, status: Table["status"], partySize?: number) => {
        await TablesApi.setStatus(id, { status, partySize });
        setTables(prev => prev.map(t => t.id === id ? { ...t, status, partySize: status === "available" ? undefined : partySize } : t));
    }, []);

    const seat = useCallback(async (id: string, size: number) => {
        await TablesApi.seat(id, size);
        setTables(prev => prev.map(t => t.id === id ? { ...t, status: "occupied", partySize: size } : t));
    }, []);

    const persistMove = useCallback(async (changed: Table) => {
        try {
            await TablesApi.updateLayout(changed.id, {
                x: changed.position.x, y: changed.position.y,
                width: changed.size.width, height: changed.size.height,
                rotation: 0, shape: changed.shape, version: changed.version,
            });
            setTables(prev => prev.map(t => t.id === changed.id ? { ...t, version: t.version + 1 } : t));
        } catch (e: any) {
            const fresh = await TablesApi.getAll();
            setTables(fresh);
        }
    }, []);

    return { tables, setTables, updateStatus, seat, persistMove };
}
