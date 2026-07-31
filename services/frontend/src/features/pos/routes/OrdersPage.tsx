import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/auth/tenant";
import { useOrders } from "@/domain/orders/hooks";
import { useTables } from "@/domain/tables/hooks";
import type { OrderDto, TenantHeaders } from "@/domain/orders/types";
import type { TableViewDto } from "@/domain/tables/types";
import { ClipboardCheck } from "lucide-react";

// Design's four order statuses. NOTE(backend): the order service currently only
// emits "Pending" / "Paid" (+ Rejected) — it has no "Ready to Serve" or
// "Served · Awaiting Payment" states yet. `toStatusKey` maps what exists today;
// once the backend supports the richer kitchen→service lifecycle, extend it so
// "ready" and "served" are produced too.
type StatusKey = "fired" | "ready" | "served" | "paid";
const ORDER_STATUS: Record<StatusKey, { label: string; dot: string; text: string }> = {
    fired: { label: "In Kitchen", dot: "bg-status-occupied", text: "text-status-occupied" },
    ready: { label: "Ready to Serve", dot: "bg-status-reserved", text: "text-status-reserved" },
    served: { label: "Served · Awaiting Payment", dot: "bg-status-available", text: "text-status-available" },
    paid: { label: "Paid", dot: "bg-muted-foreground", text: "text-muted-foreground" },
};
const ORDER_FILTERS = ["All", ...Object.values(ORDER_STATUS).map((s) => s.label)];

function toStatusKey(o: OrderDto): StatusKey {
    const s = (o.status ?? "").toLowerCase();
    if (o.paidAt || s === "paid") return "paid";
    // TODO(backend): no Ready/Served states yet — treat every unpaid order as In Kitchen.
    return "fired";
}

function formatTime(iso?: string | null) {
    if (!iso) return "";
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
}

export default function OrdersPage() {
    const navigate = useNavigate();
    const { rid, lid } = useTenant();
    const tenant: TenantHeaders | undefined = useMemo(
        () => (rid ? { restaurantId: rid, locationId: lid ?? undefined } : undefined),
        [rid, lid]
    );

    const { data, isLoading } = useOrders(tenant);
    const orders = useMemo(() => (data?.items ?? []) as OrderDto[], [data]);

    // Resolve tableId → friendly number/section
    const { data: tablesData } = useTables();
    const tableMap = useMemo(() => {
        const list: TableViewDto[] = tablesData ?? [];
        return new Map(list.map((t) => [t.id, t]));
    }, [tablesData]);

    const [filter, setFilter] = useState("All");
    const shown = useMemo(
        () => (filter === "All" ? orders : orders.filter((o) => ORDER_STATUS[toStatusKey(o)].label === filter)),
        [orders, filter],
    );

    const openOrder = (o: OrderDto) => {
        if (o.paidAt && o.receiptUrl) {
            window.open(o.receiptUrl, "_blank", "noopener,noreferrer");
            return;
        }
        if (o.tableId) navigate(`/pos/table/${o.tableId}/order?order=${encodeURIComponent(o.id)}`);
    };

    return (
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-6 pb-16">
            <h2 className="text-2xl font-semibold text-foreground mb-1">All Orders</h2>
            <p className="text-sm text-muted-foreground mb-5">
                {orders.length} order{orders.length === 1 ? "" : "s"}
            </p>

            {/* Status filter pills */}
            <div className="flex flex-wrap gap-2 mb-5">
                {ORDER_FILTERS.map((f) => {
                    const active = f === filter;
                    return (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold border transition-colors ${
                                active
                                    ? "bg-brand-soft text-brand-strong border-brand"
                                    : "bg-card text-muted-foreground border-border hover:bg-secondary"
                            }`}
                        >
                            {f}
                        </button>
                    );
                })}
            </div>

            {isLoading ? (
                <div className="text-sm text-muted-foreground py-16 text-center">Loading orders…</div>
            ) : (
                <div className="flex flex-col">
                    {/* Column header */}
                    <div className="flex items-center gap-3 px-1 py-2 border-b border-border-strong text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        <span className="w-9 shrink-0">#</span>
                        <span className="flex-1">Table</span>
                        <span className="w-40 shrink-0">Status</span>
                        <span className="w-16 shrink-0 text-right">Total</span>
                        <span className="w-14 shrink-0" />
                    </div>

                    {shown.map((o) => {
                        const key = toStatusKey(o);
                        const s = ORDER_STATUS[key];
                        const tbl = o.tableId ? tableMap.get(o.tableId) : undefined;
                        const tableNumber = tbl?.number ?? (o.tableId ? o.tableId.slice(0, 4) : "—");
                        const itemCount = o.items?.length ?? 0;
                        return (
                            <div key={o.id} className="flex items-center gap-3 px-1 py-2.5 border-b border-border">
                                <span className="w-9 shrink-0 font-numeric text-sm text-muted-foreground truncate">{tableNumber}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-foreground truncate">
                                        Table {tableNumber}
                                        {tbl?.section ? ` · ${tbl.section}` : ""}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {itemCount} item{itemCount === 1 ? "" : "s"} · placed {formatTime(o.createdAt)}
                                    </div>
                                </div>
                                <span className={`w-40 shrink-0 flex items-center gap-1.5 text-sm ${s.text}`}>
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                                    <span className="truncate">{s.label}</span>
                                </span>
                                <span className="w-16 shrink-0 text-right font-numeric text-sm font-semibold text-foreground">
                                    ${Number(o.grandTotal ?? 0).toFixed(2)}
                                </span>
                                <span className="w-14 shrink-0 text-right">
                                    <button
                                        onClick={() => openOrder(o)}
                                        className="text-sm font-semibold text-brand-strong hover:underline"
                                    >
                                        {key === "paid" ? "View" : "Open"}
                                    </button>
                                </span>
                            </div>
                        );
                    })}

                    {shown.length === 0 && (
                        <div className="flex flex-col items-center gap-2.5 py-16 text-center text-muted-foreground">
                            <ClipboardCheck className="h-7 w-7" />
                            <span className="text-sm">
                                {orders.length === 0 ? "No orders yet." : "No orders in this state."}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
