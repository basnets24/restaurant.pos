// src/pages/Home.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../api-authorization/AuthProvider";

// UI
import { AppHeader } from "@/components/AppHeader";
import { CardGrid } from "@/components/primitives/CardGrid";
import { StatCard } from "@/components/primitives/StatCard";

// Icons (lucide-react)
import {
    ChevronRight, TrendingUp,
    AlertTriangle, CalendarClock, UserPlus, CreditCard, Package, CheckCircle2, X,
    type LucideIcon,
} from "lucide-react";
import { FloorsOrdersIcon, ManagementHubIcon } from "@/components/brand-icons/section-icons";

// Data hooks
import { useTables as useDomainTables } from "@/domain/tables/hooks";
import { useRestaurantUserProfile } from "@/domain/restaurantUserProfile/Provider";
import { useTenant } from "@/app/TenantContext";
import { useTenantInfo } from "@/app/TenantInfoProvider";
import { useEmployeeDomain } from "@/domain/employee/Provider";
import { useKitchen } from "@/features/pos/kitchen/kitchenStore";

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
interface Notification {
    id: number;
    icon: LucideIcon;
    text: string;
    variant: NotificationVariant;
    time: string;
}

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

export function Dashboard({ onSelectPOS, onSelectManagement }: DashboardProps) {
    const navigate = useNavigate();
    const { profile } = useAuth();

    const hooks = useRestaurantUserProfile();
    const { rid, lid } = useTenant();
    hooks.useOnboardingStatus({ rid: rid ?? undefined, lid: lid ?? undefined }, { retry: 1 });

    const { restaurantName: nameFromTenant, locations } = useTenantInfo();
    const restaurantName = nameFromTenant || (profile?.["restaurant_name"] as string) || "Your Restaurant";
    const locationLabel =
        (locations?.find((l) => l.id === lid) ?? locations?.find((l) => l.isActive) ?? locations?.[0])?.name ?? "";

    const { data: tablesData } = useDomainTables();
    const employee = useEmployeeDomain();
    const employees = employee.useEmployees(rid ?? "", { page: 1, pageSize: 1 }, { enabled: !!rid });
    const kitchen = useKitchen();
    const activeOrdersCount = kitchen.active().length;

    const stats = useMemo(() => {
        const list = tablesData ?? [];
        const total = list.length;
        const occupied = list.filter((t: any) => t.status === "occupied").length;
        const capacityPct = total ? Math.round((occupied / total) * 100) : 0;
        return { total, occupied, capacityText: `${capacityPct}% capacity` };
    }, [tablesData]);

    const num = (v: React.ReactNode) => <span className="font-numeric">{v}</span>;
    const quickStats = [
        { label: "Today's Sales", value: num("$2,847.50"), change: "+12.5%", trend: "up" as const, onClick: () => navigate("/management") },
        { label: "Active Orders", value: num(String(activeOrdersCount)), trend: "neutral" as const, onClick: () => navigate("/pos/current") },
        { label: "Staff On Duty", value: num(String(employees.data?.total ?? "—")), trend: "neutral" as const, onClick: () => navigate("/management") },
        { label: "Tables Occupied", value: num(`${stats.occupied}/${stats.total}`), change: stats.capacityText, trend: "neutral" as const, onClick: () => navigate("/pos/tables") },
    ];

    // Static demo notifications (no notifications backend yet)
    const [notifications, setNotifications] = useState<Notification[]>([
        { id: 1, icon: AlertTriangle, text: "3 menu items running low on stock", variant: "warning", time: "5 min ago" },
        { id: 2, icon: CalendarClock, text: "Reservation conflict at 7:30 PM for Table 4", variant: "danger", time: "18 min ago" },
        { id: 3, icon: UserPlus, text: "New staff member Priya added to schedule", variant: "neutral", time: "1 hr ago" },
        { id: 4, icon: CreditCard, text: "Payment failed for order #482", variant: "danger", time: "2 hr ago" },
        { id: 5, icon: Package, text: "Delivery from Riverside Produce arrived", variant: "neutral", time: "Yesterday" },
    ]);

    const workspaces = [
        { icon: FloorsOrdersIcon, title: "Floor & Orders", description: "Take orders, process payments, and manage your restaurant floor", onClick: onSelectPOS },
        { icon: ManagementHubIcon, title: "Management Hub", description: "Analytics, staff management, inventory, and business insights", onClick: onSelectManagement },
    ];

    return (
        <div className="min-h-screen bg-background">
            <AppHeader
                title={restaurantName}
                subtitle={locationLabel || undefined}
                logo="RMS"
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
                            icon={s.trend === "up" ? <TrendingUp className="h-8 w-8 text-status-available" /> : undefined}
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
                        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                            <span className="text-sm font-semibold text-foreground">Notifications</span>
                            {notifications.length > 0 && (
                                <button
                                    onClick={() => setNotifications([])}
                                    className="text-xs font-semibold text-brand hover:underline"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 px-5 py-9 text-center text-muted-foreground">
                                <CheckCircle2 className="w-6 h-6" />
                                <span className="text-sm">You're all caught up</span>
                            </div>
                        ) : (
                            <div className="flex flex-col overflow-y-auto">
                                {notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        className={`flex items-start gap-2.5 px-5 py-3 border-b border-border last:border-b-0 ${NOTIFICATION_ROW_BG[n.variant]}`}
                                    >
                                        <n.icon className={`w-4 h-4 shrink-0 mt-0.5 ${NOTIFICATION_ICON_COLOR[n.variant]}`} />
                                        <div className="flex-1 flex flex-col gap-0.5">
                                            <span className="text-sm text-foreground">{n.text}</span>
                                            <span className="text-xs text-muted-foreground">{n.time}</span>
                                        </div>
                                        <button
                                            onClick={() => setNotifications((list) => list.filter((x) => x.id !== n.id))}
                                            className="w-6 h-6 shrink-0 flex items-center justify-center rounded-md hover:bg-secondary"
                                            aria-label="Dismiss notification"
                                        >
                                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
