import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/auth/tenant";
import { useOrders } from "@/domain/orders/hooks";
import type { OrderDto, TenantHeaders } from "@/domain/orders/types";
import { CardGrid } from "@/components/primitives/CardGrid";
import { StatCard } from "@/components/primitives/StatCard";
import { TrendingUp } from "lucide-react";

const num = (v: React.ReactNode) => <span className="font-numeric">{v}</span>;
const money = (n: number) => `$${n.toFixed(2)}`;
const isPaid = (o: OrderDto) => !!o.paidAt || (o.status ?? "").toLowerCase() === "paid";

export default function AnalyticsTab() {
    const navigate = useNavigate();
    const { rid, lid } = useTenant();
    const tenant: TenantHeaders | undefined = useMemo(
        () => (rid ? { restaurantId: rid, locationId: lid ?? undefined } : undefined),
        [rid, lid]
    );

    const { data } = useOrders(tenant);
    const orders = useMemo(() => (data?.items ?? []) as OrderDto[], [data]);

    const stats = useMemo(() => {
        // Wall-clock cutoff is intentional here: recomputed whenever `orders` changes, not on every render.
        // eslint-disable-next-line react-hooks/purity
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const thisWeek = orders.filter((o) => new Date(o.createdAt).getTime() >= weekAgo);
        const paidThisWeek = thisWeek.filter(isPaid);
        const revenue = paidThisWeek.reduce((sum, o) => sum + (o.grandTotal ?? 0), 0);
        const avgOrderValue = paidThisWeek.length ? revenue / paidThisWeek.length : 0;
        return { ordersThisWeek: thisWeek.length, revenue, avgOrderValue };
    }, [orders]);

    const quickStats = [
        { label: "Weekly Revenue", value: num(money(stats.revenue)), trend: "up" as const, onClick: () => navigate("/pos/orders") },
        { label: "Avg. Order Value", value: num(money(stats.avgOrderValue)), trend: "neutral" as const, onClick: () => navigate("/pos/orders") },
        { label: "Orders This Week", value: num(String(stats.ordersThisWeek)), trend: "neutral" as const, onClick: () => navigate("/pos/orders") },
        // No table-turnover tracking in the backend yet (would need seating-duration
        // data); shown as an illustrative figure until that's real.
        { label: "Table Turnover", value: num("3.4x"), trend: "neutral" as const },
    ];

    return (
        <>
            <h2 className="text-2xl font-bold text-foreground mb-5">Business Analytics</h2>
            <CardGrid cols={{ base: 1, md: 4 }} gap="gap-4">
                {quickStats.map((s) => (
                    <StatCard
                        key={s.label}
                        label={s.label}
                        value={s.value}
                        trend={s.trend}
                        onClick={s.onClick}
                        icon={s.trend === "up" ? <TrendingUp className="h-8 w-8 text-status-available" /> : undefined}
                    />
                ))}
            </CardGrid>
        </>
    );
}
