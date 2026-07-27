// src/features/management/ManagementLayout.tsx
import { Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { BarChart3, Users, Package, Calendar, Utensils } from "lucide-react";
import { useCan } from "@/auth/permissions";
import { User, Shield, Bell } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useTenantInfo } from "@/app/TenantInfoProvider";

type ManagementTab = "analytics" | "staff" | "inventory" | "menu" | "reservations";

const TAB_LIST: { value: ManagementTab; label: string; Icon: any }[] = [
    { value: "analytics",    label: "Analytics",    Icon: BarChart3 },
    { value: "staff",        label: "Staff",        Icon: Users },
    { value: "inventory",    label: "Inventory",    Icon: Package },
    { value: "menu",         label: "Menu",         Icon: Utensils },
    { value: "reservations", label: "Reservations", Icon: Calendar },
];

export type ManagementOutletContext = { userData: any };

export default function ManagementLayout({ userData }: { userData?: any }) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { restaurantName: nameFromTenant } = useTenantInfo();

    // derive the active tab from the path: /management/<tab>
    const active = (pathname.split("/")[2] as ManagementTab) ?? "analytics";
    const isValid = TAB_LIST.some(t => t.value === active);
    const activeTab = isValid ? active : "analytics";

    const go = (to: string) => navigate(to);
    const canManageStaff = useCan("manageStaff");

    return (
        <div className="min-h-screen bg-background">
            <AppHeader
                title="Management Dashboard"
                subtitle={nameFromTenant ?? userData?.restaurantName}
                logo="RMS"
                menuItems={[
                    { label: "Account", icon: User, onClick: () => navigate("/settings/account") },
                    { label: "Security", icon: Shield, onClick: () => navigate("/settings/security") },
                    { label: "Notifications", icon: Bell, onClick: () => navigate("/settings/notifications") },
                ]}
            />

            {/* Tabs bar (driven by route) */}
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="overflow-x-auto">
                    <Tabs value={activeTab} onValueChange={(v) => go(`/management/${v}`)} className="space-y-8">
                        <TabsList className="w-full rounded-2xl p-2 flex items-center gap-3 overflow-x-auto">
                            {TAB_LIST.filter(t => t.value !== "staff" || canManageStaff).map(({ value, label, Icon }) => (
                                <TabsTrigger
                                  key={value}
                                  value={value}
                                  className="flex items-center gap-2 px-6 py-3.5 text-xl flex-none"
                                >
                                    <Icon className="h-6 w-6" />
                                    <span className="hidden sm:inline">{label}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {/* Route content renders here */}
                        <div className="space-y-8">
                            <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
                                <Outlet context={{ userData } satisfies ManagementOutletContext} />
                            </Suspense>
                        </div>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
