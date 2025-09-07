// src/pages/Home.tsx
import  { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../api-authorization/AuthProvider";
import { AuthorizationPaths } from "../api-authorization/ApiAuthorizationConstants";

// UI (shadcn)
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { CardGrid } from "@/components/primitives/CardGrid";
import { StatCard } from "@/components/primitives/StatCard";

// Icons (lucide-react)
import {
    ShoppingCart, CreditCard, Clock, BarChart3, Users, Package,
    Calendar, Settings, TrendingUp, User, ArrowRight, LogOut, Shield
} from "lucide-react";

// Your data hook (adjust the import path to match your project)
// Prefer domain tables API via React Query
import { useTables as useDomainTables } from "@/domain/tables/hooks";

function getDisplayName(p?: Record<string, unknown>) {
    if (!p) return "User";
    return (
        (p["name"] as string) ??
        ([p["given_name"], p["family_name"]].filter(Boolean).join(" ") || undefined) ??
        (p["preferred_username"] as string) ??
        (p["email"] as string) ??
        "User"
    );
}

export default function Home() {
    const { isAuthenticated, profile, signOut } = useAuth();
    const navigate = useNavigate();

    if (!isAuthenticated) return <div>Please log in first.</div>;

    const displayName = getDisplayName(profile);
    const firstName = (profile?.["given_name"] as string) ?? displayName.split(" ")[0] ?? displayName;
    const lastName = (profile?.["family_name"] as string) ?? "";
    const restaurantName = (profile?.["restaurant_name"] as string) ?? "Your Restaurant";

    const onSelectPOS = () => navigate("/pos/tables");
    const onSelectManagement = () => navigate("/management");

    const onLogout = () => {
        // Proper IdentityServer logout: redirects to IdP,
        // then returns to /authentication/logout-callback
        void signOut(`${window.location.origin}${AuthorizationPaths.DefaultLoginRedirectPath}`);
    };

    return (
        <Dashboard
            userData={{ restaurantName, firstName, lastName }}
            onSelectPOS={onSelectPOS}
            onSelectManagement={onSelectManagement}
            onLogout={onLogout}
        />
    );
}

interface DashboardProps {
    userData: { restaurantName: string; firstName: string; lastName: string };
    onSelectPOS: () => void;
    onSelectManagement: () => void;
    onLogout: () => void;
}

export function Dashboard({
                              userData,
                              onSelectPOS,
                              onSelectManagement,
                              onLogout,
                          }: DashboardProps) {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const rawRoles = (profile as any)?.role as string | string[] | undefined;
    const roles = Array.isArray(rawRoles) ? rawRoles : rawRoles ? [rawRoles] : [];
    const canAccessAdmin = roles.includes("Admin") || roles.includes("Manager");
    const { data: tablesData } = useDomainTables();

    const stats = useMemo(() => {
        const list = tablesData ?? [];
        const total = list.length;
        const occupied = list.filter((t: any) => t.status === "occupied").length;
        const capacityPct = total ? Math.round((occupied / total) * 100) : 0;
        return { total, occupied, capacityText: `${capacityPct}% capacity` };
    }, [tablesData]);

    const quickStats = [
        { label: "Today's Sales", value: "$2,847.50", change: "+12.5%", trend: "up" as const },
        { label: "Active Orders", value: "23", change: "+5", trend: "up" as const },
        { label: "Staff On Duty", value: "8", change: "2 arriving soon", trend: "neutral" as const },
        { label: "Tables Occupied", value: `${stats.occupied}/${stats.total}`, change: stats.capacityText, trend: "neutral" as const },
    ];

    const posFeatures = [
        { icon: ShoppingCart, title: "Order Management", description: "Take orders, track progress, and manage tables" },
        { icon: CreditCard,  title: "Payment Processing", description: "Accept all payment methods with secure checkout" },
        { icon: Clock,       title: "Real-time Updates",  description: "Live order tracking and kitchen communication" },
    ];

    const managementFeatures = [
        { icon: BarChart3, title: "Analytics & Reports",  description: "Sales reports, performance metrics, and insights" },
        { icon: Users,     title: "Staff Management",     description: "Employee scheduling, roles, and performance" },
        { icon: Package,   title: "Inventory Control",    description: "Stock management, suppliers, and cost tracking" },
        { icon: Calendar,  title: "Reservations",         description: "Bookings, customer management, scheduling" },
        { icon: Settings,  title: "Restaurant Settings",  description: "Menu, pricing, and system configuration" },
        { icon: TrendingUp,title: "Business Intelligence",description: "Growth tracking, forecasting, optimization" },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-card shadow-sm border-b border-border">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                                <span className="text-primary-foreground font-bold">RMS</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-foreground">{userData.restaurantName}</h1>
                                <p className="text-sm text-muted-foreground">Restaurant Management Dashboard</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">
                  {userData.firstName} {userData.lastName}
                </span>
                            </div>
                            {canAccessAdmin && (
                                <Button variant="outline" onClick={() => navigate("/admin")} size="sm">
                                    <Shield className="h-4 w-4 mr-2" />
                                    Admin
                                </Button>
                            )}
                            <Button variant="outline" onClick={onLogout} size="sm">
                                <LogOut className="h-4 w-4 mr-2" />
                                Logout
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-foreground mb-2">
                        Welcome back, {userData.firstName}!
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Choose your workspace to get started with your restaurant operations.
                    </p>
                </div>

                {/* Quick Stats */}
                <CardGrid cols={{ base: 1, sm: 2, lg: 4 }} gap="gap-6" className="mb-12">
                  {quickStats.map((s, i) => (
                    <StatCard
                      key={i}
                      label={s.label}
                      value={s.value}
                      change={s.change}
                      trend={s.trend}
                      icon={s.trend === "up" ? <TrendingUp className="h-8 w-8 text-green-600" /> : undefined}
                    />
                  ))}
                </CardGrid>

                {/* Main Action Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    {/* POS */}
                    <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/30">
                        <CardHeader className="text-center pb-6">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                                <ShoppingCart className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl">Point of Sale</CardTitle>
                            <CardDescription className="text-lg">
                                Take orders, process payments, and manage your restaurant floor
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                {posFeatures.map((f, idx) => (
                                    <div key={idx} className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <f.icon className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-foreground">{f.title}</h4>
                                            <p className="text-sm text-muted-foreground">{f.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button onClick={onSelectPOS} size="lg" className="w-full group-hover:shadow-lg transition-all duration-200">
                                Open POS System
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Management */}
                    <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/30">
                        <CardHeader className="text-center pb-6">
                            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                                <BarChart3 className="w-8 h-8 text-primary" />
                            </div>
                            <CardTitle className="text-2xl">Management Suite</CardTitle>
                            <CardDescription className="text-lg">
                                Analytics, staff management, inventory, and business insights
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                {managementFeatures.map((f, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <f.icon className="w-3 h-3 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-sm text-foreground">{f.title}</h4>
                                            <p className="text-xs text-muted-foreground">{f.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button
                                onClick={onSelectManagement}
                                size="lg"
                                variant="outline"
                                className="w-full group-hover:shadow-lg transition-all duration-200 group-hover:bg-primary group-hover:text-primary-foreground"
                            >
                                Open Management Dashboard
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Activity & Quick Actions */}
                {/* ... keep your remaining sections unchanged ... */}
            </div>
        </div>
    );
}
