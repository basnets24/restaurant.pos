// src/features/management/ManagementLayout.tsx
import { Suspense, type ComponentType } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Utensils, Settings } from "lucide-react";
import { useCan } from "@/auth/permissions";
import { useAuth } from "@/api-authorization/AuthProvider";
import { isDemoProfile } from "@/auth/demoSession";
import { User, Shield, Bell } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useTenantInfo } from "@/app/TenantInfoProvider";
import { GrowthChartIcon } from "@/components/brand-icons/report-icons";
import { ChefIcon } from "@/components/brand-icons/staff-icons";
import type { RestaurantUserData } from "./types";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

type ManagementTab = "analytics" | "staff" | "menu" | "admin";
type TabIcon = ComponentType<{ className?: string }>;

const TAB_LIST: { value: ManagementTab; label: string; Icon: TabIcon }[] = [
    { value: "analytics", label: "Analytics", Icon: GrowthChartIcon },
    { value: "staff",     label: "Staff",     Icon: ChefIcon },
    { value: "menu",      label: "Menu",      Icon: Utensils },
];

const ADMIN_ITEM: { value: ManagementTab; label: string; Icon: TabIcon } = { value: "admin", label: "Admin", Icon: Settings };
const ALL_TABS = [...TAB_LIST, ADMIN_ITEM];

export type ManagementOutletContext = { userData?: RestaurantUserData };

export default function ManagementLayout({ userData }: { userData?: RestaurantUserData }) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { restaurantName: nameFromTenant } = useTenantInfo();

    // derive the active tab from the path: /management/<tab>
    const active = (pathname.split("/")[2] as ManagementTab) ?? "analytics";
    const isValid = ALL_TABS.some(t => t.value === active);
    const activeTab = isValid ? active : "analytics";
    useDocumentTitle(`${ALL_TABS.find(t => t.value === activeTab)?.label ?? "Management"} · Spoontab`);

    const go = (to: string) => navigate(to);
    const canManageStaff = useCan("manageStaff");
    const { profile } = useAuth();
    // The public demo_admin session carries the same Admin/Manager roles as a
    // real login (see auth/demoSession.ts), so role checks alone don't hide
    // this - Admin is an org-settings/floor-plan/roles editor demo visitors
    // shouldn't be able to reach. Route access is separately blocked via
    // ProtectedRoute's blockDemo prop (app/router.tsx) in case someone
    // navigates here directly instead of through this nav.
    const showAdmin = canManageStaff && !isDemoProfile(profile);

    const coreTabs = TAB_LIST.filter(t => t.value !== "staff" || canManageStaff);

    return (
        <div className="min-h-screen bg-background">
            <AppHeader
                title="Management Dashboard"
                subtitle={nameFromTenant ?? userData?.restaurantName}
                menuItems={[
                    { label: "Account", icon: User, onClick: () => navigate("/settings/account") },
                    { label: "Security", icon: Shield, onClick: () => navigate("/settings/security") },
                    { label: "Notifications", icon: Bell, onClick: () => navigate("/settings/notifications") },
                ]}
            />

            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8 items-stretch md:items-start">
                <Tabs
                    value={activeTab}
                    onValueChange={(v) => go(`/management/${v}`)}
                    orientation="vertical"
                    className="hidden md:block w-[232px] shrink-0 sticky top-24 gap-1"
                >
                    <TabsList className="flex-col h-auto w-full bg-transparent p-0 gap-1 items-stretch">
                        {coreTabs.map(({ value, label, Icon }) => (
                            <TabsTrigger
                                key={value}
                                value={value}
                                className="justify-start gap-3 px-3.5 py-3 text-base font-semibold rounded-[10px] text-muted-foreground bg-transparent shadow-none data-[state=active]:bg-brand-soft data-[state=active]:text-brand-strong data-[state=active]:shadow-none"
                            >
                                <Icon className="h-8 w-8 shrink-0" />
                                {label}
                            </TabsTrigger>
                        ))}

                        {showAdmin && (
                            <>
                                <div className="h-px bg-border my-2 mx-1" />
                                <TabsTrigger
                                    value={ADMIN_ITEM.value}
                                    className="justify-start gap-3 px-3.5 py-3 text-base font-semibold rounded-[10px] text-muted-foreground bg-transparent shadow-none data-[state=active]:bg-brand-soft data-[state=active]:text-brand-strong data-[state=active]:shadow-none"
                                >
                                    <ADMIN_ITEM.Icon className="h-8 w-8 shrink-0" />
                                    {ADMIN_ITEM.label}
                                </TabsTrigger>
                            </>
                        )}
                    </TabsList>
                </Tabs>

                {/* Mobile: horizontal scroll nav */}
                <Tabs
                    value={activeTab}
                    onValueChange={(v) => go(`/management/${v}`)}
                    className="md:hidden w-full"
                >
                    <TabsList className="w-full h-auto rounded-2xl p-1.5 flex items-center gap-1.5 bg-muted/50 overflow-x-auto">
                        {(showAdmin ? [...coreTabs, ADMIN_ITEM] : coreTabs).map(({ value, label, Icon }) => (
                            <TabsTrigger
                                key={value}
                                value={value}
                                className="flex items-center gap-2.5 px-5 py-2.5 text-base font-medium flex-none data-[state=active]:shadow-sm"
                            >
                                <Icon className="h-6 w-6 shrink-0" />
                                <span className="hidden sm:inline">{label}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                {/* Route content renders here */}
                <div className="flex-1 min-w-0">
                    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading…</div>}>
                        <Outlet context={{ userData } satisfies ManagementOutletContext} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
