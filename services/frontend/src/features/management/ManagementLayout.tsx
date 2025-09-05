// src/features/management/ManagementLayout.tsx
import { Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { ArrowLeft, Home, BarChart3, Users, Package, Calendar, Settings, Utensils } from "lucide-react";

type ManagementTab = "analytics" | "staff" | "inventory" | "menu" | "reservations" | "settings";

const TAB_LIST: { value: ManagementTab; label: string; Icon: any }[] = [
    { value: "analytics",    label: "Analytics",    Icon: BarChart3 },
    { value: "staff",        label: "Staff",        Icon: Users },
    { value: "inventory",    label: "Inventory",    Icon: Package },
    { value: "menu",         label: "Menu",         Icon: Utensils },
    { value: "reservations", label: "Reservations", Icon: Calendar },
    { value: "settings",     label: "Settings",     Icon: Settings },
];

export type ManagementOutletContext = { userData: any };

export default function ManagementLayout({ userData }: { userData?: any }) {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // derive the active tab from the path: /management/<tab>
    const active = (pathname.split("/")[2] as ManagementTab) ?? "analytics";
    const isValid = TAB_LIST.some(t => t.value === active);
    const activeTab = isValid ? active : "analytics";

    const go = (to: string) => navigate(to);
    const backToDashboard = () => navigate("/home");
    const backToLanding = () => navigate("/");

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-card shadow-sm border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" onClick={backToDashboard} className="flex items-center gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Back to Dashboard
                            </Button>

                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                                    <span className="text-primary-foreground font-bold text-sm">RMS</span>
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-foreground">Management Dashboard</h1>
                                    <p className="text-sm text-muted-foreground">{userData?.restaurantName}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button variant="ghost" onClick={backToLanding} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                                <Home className="h-4 w-4" />
                                Home
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tabs bar (driven by route) */}
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="overflow-x-auto">
                    <Tabs value={activeTab} onValueChange={(v) => go(`/management/${v}`)} className="space-y-8">
                        <TabsList className="grid min-w-max grid-cols-6 gap-2 rounded-2xl p-2 md:w-full md:grid-cols-6">
                            {TAB_LIST.map(({ value, label, Icon }) => (
                                <TabsTrigger key={value} value={value} className="flex items-center gap-2 px-4 py-3 text-base">
                                    <Icon className="h-5 w-5" />
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
