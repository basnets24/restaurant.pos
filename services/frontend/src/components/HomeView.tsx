// src/pages/Home.tsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../api-authorization/AuthProvider";

// UI
import { AppHeader } from "@/components/AppHeader";
import { CardGrid } from "@/components/primitives/CardGrid";
import { StatCard } from "@/components/primitives/StatCard";

// Icons (lucide-react)
import {
    ChevronRight,
    AlertTriangle, CalendarClock, UserPlus, CreditCard, Package, CheckCircle2, X,
    type LucideIcon,
} from "lucide-react";
import { FloorsOrdersIcon, ManagementHubIcon } from "@/components/brand-icons/section-icons";

// Data hooks
import { useTables as useDomainTables } from "@/domain/tables/hooks";
import { useRestaurantUserProfile } from "@/domain/restaurantUserProfile/Provider";
import { useTenant } from "@/auth/tenant";
import { useTenantInfo } from "@/app/TenantInfoProvider";
import { useEmployeeDomain } from "@/domain/employee/Provider";
import { useKitchen } from "@/features/pos/kitchen/kitchenStore";
import { useNotifications, useMarkNotificationRead, useNotificationHub } from "@/domain/notifications";
import type { NotificationType as ApiNotificationType } from "@/domain/notifications";
import { useOrders } from "@/domain/orders/hooks";
import type { OrderDto, TenantHeaders } from "@/domain/orders/types";

export default function Home() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    if (!isAuthenticated) return <div>Please log in first.</div>;

    const onSelectPOS = () => navigate("/pos/tables");
    const onSelectManagement = () => navigate("/management");

    return (
        <Dashboard
            onSelectPOS={onSelectPOS}
            onSelectManagement={onSelectManagement}
        />
    );
}

interface DashboardProps {
    onSelectPOS: () => void;
    onSelectManagement: () => void;
}

type NotificationVariant = "warning" | "danger" | "neutral";

const NOTIFICATION_ROW_BG: Record<NotificationVariant, string> = {
    warning: "bg-status-reserved-soft",
    danger: "bg-status-occupied-soft",
    neutral: "",
};
const NOTIFICATION_ICON_COLOR: Record<NotificationVariant, string> = {
    warning: "text-status-reserved",
    danger: "text-status-occupied",
    neutral: "text-muted-foreground",
};

const NOTIFICATION_ICON: Record<ApiNotificationType, LucideIcon> = {
    TableSeated: UserPlus,
    TableAvailable: CheckCircle2,
    TableReserved: CalendarClock,
    TableDirty: AlertTriangle,
    TableCleared: CheckCircle2,
    OrderUnlinked: CreditCard,
    TablesJoined: Package,
    TablesSplit: Package,
    TableRemoved: AlertTriangle,
};
const NOTIFICATION_VARIANT: Record<ApiNotificationType, NotificationVariant> = {
    TableSeated: "neutral",
    TableAvailable: "neutral",
    TableReserved: "warning",
    TableDirty: "warning",
    TableCleared: "neutral",
    OrderUnlinked: "neutral",
    TablesJoined: "neutral",
    TablesSplit: "neutral",
    TableRemoved: "danger",
};

const isPaid = (o: OrderDto) => !!o.paidAt || (o.status ?? "").toLowerCase() === "paid";

function formatRelativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
}

export function Dashboard({ onSelectPOS, onSelectManagement }: DashboardProps) {
    const navigate = useNavigate();

    const hooks = useRestaurantUserProfile();
    const { rid, lid } = useTenant();
    hooks.useOnboardingStatus({ rid: rid ?? undefined, lid: lid ?? undefined }, { retry: 1 });

    const { data: notificationsData } = useNotifications();
    const markNotificationRead = useMarkNotificationRead();
    useNotificationHub();
    // Read notifications drop out of this compact widget instead of just
    // dimming in place - marking one read (the X button) is effectively how
    // you dismiss it now that there's no "Clear all", so the list stays short.
    const notifications = (notificationsData ?? []).filter((n) => !n.readAt);

    const { restaurantName: nameFromTenant, locations } = useTenantInfo();
    const restaurantName = nameFromTenant || "Your Restaurant";
    const locationLabel =
        (locations?.find((l) => l.id === lid) ?? locations?.find((l) => l.isActive) ?? locations?.[0])?.name ?? "";

    const { data: tablesData } = useDomainTables();
    const employee = useEmployeeDomain();
    const employees = employee.useEmployees(rid ?? "", { page: 1, pageSize: 1 }, { enabled: !!rid });
    const kitchen = useKitchen();
    const activeOrdersCount = kitchen.active().length;

    const orderTenant: TenantHeaders | undefined = useMemo(
        () => (rid ? { restaurantId: rid, locationId: lid ?? undefined } : undefined),
        [rid, lid]
    );
    const { data: ordersData } = useOrders(orderTenant);
    const orders = useMemo(() => (ordersData?.items ?? []) as OrderDto[], [ordersData]);

    const stats = useMemo(() => {
        const list = tablesData ?? [];
        const total = list.length;
        const occupied = list.filter((t) => t.status === "occupied").length;
        const capacityPct = total ? Math.round((occupied / total) * 100) : 0;

        // Wall-clock cutoff is intentional here: recomputed whenever `orders` changes, not on every render.
        const startOfToday = new Date().setHours(0, 0, 0, 0);
        const paidToday = orders.filter((o) => isPaid(o) && new Date(o.createdAt).getTime() >= startOfToday);
        const salesToday = paidToday.reduce((sum, o) => sum + (o.grandTotal ?? 0), 0);

        return { total, occupied, capacityText: `${capacityPct}% capacity`, salesToday };
    }, [tablesData, orders]);

    const num = (v: React.ReactNode) => <span className="font-numeric">{v}</span>;
    const money = (n: number) => `$${n.toFixed(2)}`;
    const quickStats = [
        { label: "Today's Sales", value: num(money(stats.salesToday)), trend: "neutral" as const, onClick: () => navigate("/management") },
        { label: "Active Orders", value: num(String(activeOrdersCount)), trend: "neutral" as const, onClick: () => navigate("/pos/current") },
        { label: "Staff On Duty", value: num(String(employees.data?.total ?? "—")), trend: "neutral" as const, onClick: () => navigate("/management/staff") },
        { label: "Tables Occupied", value: num(`${stats.occupied}/${stats.total}`), change: stats.capacityText, trend: "neutral" as const, onClick: () => navigate("/pos/tables") },
    ];

    const workspaces = [
        { icon: FloorsOrdersIcon, title: "Floor & Orders", description: "Take orders, process payments, and manage your restaurant floor", onClick: onSelectPOS },
        { icon: ManagementHubIcon, title: "Management Hub", description: "Analytics, staff management, inventory, and business insights", onClick: onSelectManagement },
    ];

    return (
        <div className="min-h-screen bg-background">
            <AppHeader
                title={restaurantName}
                subtitle={locationLabel || undefined}
            />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Quick Stats */}
                <CardGrid cols={{ base: 1, md: 4 }} gap="gap-4" className="mb-8">
                    {quickStats.map((s, i) => (
                        <StatCard
                            key={i}
                            label={s.label}
                            value={s.value}
                            change={s.change}
                            trend={s.trend}
                            onClick={s.onClick}
                        />
                    ))}
                </CardGrid>

                {/* Workspaces + Notifications */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                    {/* Workspaces */}
                    <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
                        <div className="px-5 py-4 border-b border-border text-sm font-semibold text-foreground">
                            Workspaces
                        </div>
                        {workspaces.map((w, i) => (
                            <button
                                key={w.title}
                                onClick={w.onClick}
                                className={`group flex flex-1 items-center gap-5 px-5 py-6 text-left transition-colors hover:bg-secondary focus:outline-none focus-visible:bg-secondary ${i < workspaces.length - 1 ? "border-b border-border" : ""}`}
                            >
                                <div className="w-20 h-20 shrink-0 bg-brand-soft rounded-[18px] flex items-center justify-center">
                                    <w.icon className="w-14 h-14" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="mb-1 text-xl font-semibold text-foreground">{w.title}</h3>
                                    <p className="text-sm text-muted-foreground">{w.description}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                            </button>
                        ))}
                    </div>

                    {/* Notifications */}
                    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col max-h-[340px]">
                        <div className="px-5 py-3.5 border-b border-border">
                            <span className="text-sm font-semibold text-foreground">Notifications</span>
                        </div>

                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 px-5 py-9 text-center text-muted-foreground">
                                <CheckCircle2 className="w-6 h-6" />
                                <span className="text-sm">You're all caught up</span>
                            </div>
                        ) : (
                            <div className="flex flex-col overflow-y-auto">
                                {notifications.map((n) => {
                                    const Icon = NOTIFICATION_ICON[n.type] ?? AlertTriangle;
                                    const variant = NOTIFICATION_VARIANT[n.type] ?? "neutral";
                                    return (
                                        <div
                                            key={n.id}
                                            className={`flex items-start gap-2.5 px-5 py-3 border-b border-border last:border-b-0 ${NOTIFICATION_ROW_BG[variant]}`}
                                        >
                                            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${NOTIFICATION_ICON_COLOR[variant]}`} />
                                            <div className="flex-1 flex flex-col gap-0.5">
                                                <span className="text-sm text-foreground">{n.title}</span>
                                                <span className="text-xs text-muted-foreground">{formatRelativeTime(n.createdAt)}</span>
                                            </div>
                                            <button
                                                onClick={() => markNotificationRead.mutate(n.id)}
                                                className="w-6 h-6 shrink-0 flex items-center justify-center rounded-md hover:bg-secondary"
                                                aria-label="Dismiss"
                                            >
                                                <X className="w-3.5 h-3.5 text-muted-foreground" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
