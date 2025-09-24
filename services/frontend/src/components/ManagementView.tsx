import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { CardGrid } from "@/components/primitives/CardGrid";
import { StatCard } from "@/components/primitives/StatCard";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "./ui/tabs";
import {
    BarChart3,
    Users,
    Package,
    Calendar,
    Settings,
    TrendingUp,
    DollarSign,
    ArrowLeft,
    Home,
    User,
    Building2,
} from "lucide-react";
import StaffUsersCard from "@/features/management/components/StaffUsersCard";
import { useTenantInfo } from "@/app/TenantInfoProvider";
import InventoryStockCard from "@/features/management/components/InventoryCard";
import MenuItemsCard from "@/features/management/components/MenuCard";
interface ManagementViewProps {
    userData: any;
    onBackToDashboard?: () => void;
    onBackToLanding?: () => void;
}

export default function ManagementView({
                                           userData,
                                           onBackToDashboard,
                                           onBackToLanding,
                                       }: ManagementViewProps) {
    const { restaurantName: nameFromTenant } = useTenantInfo();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<"analytics" | "staff" | "inventory" | "reservations" | "settings">("analytics");

    // Fallbacks if handlers aren’t provided
    const backToDashboard = onBackToDashboard ?? (() => navigate("/"));
    const backToLanding = onBackToLanding ?? (() => navigate("/pos"));

    const analyticsData = {
        revenue: { today: 2847.5, week: 18920.75, month: 75680.25, change: 12.5 },
        orders: { today: 87, week: 542, month: 2180, change: 8.3 },
        customers: { today: 156, week: 1024, month: 4280, change: 15.2 },
    };

    
    const reservationsData = [
        { id: 1, name: "Johnson Party", time: "7:00 PM", party: 4, table: "A2", status: "confirmed" },
        { id: 2, name: "Smith Anniversary", time: "7:30 PM", party: 2, table: "B5", status: "confirmed" },
        { id: 3, name: "Corporate Dinner", time: "8:00 PM", party: 8, table: "C1-C2", status: "pending" },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active": return "bg-green-100 text-green-800";
            case "break": return "bg-yellow-100 text-yellow-800";
            case "off": return "bg-gray-100 text-gray-800";
            case "critical": return "bg-red-100 text-red-800";
            case "low": return "bg-yellow-100 text-yellow-800";
            case "good": return "bg-green-100 text-green-800";
            case "confirmed": return "bg-green-100 text-green-800";
            case "pending": return "bg-yellow-100 text-yellow-800";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="bg-card shadow-sm border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                onClick={backToDashboard}
                                className="flex items-center gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Dashboard
                            </Button>

                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
                                    <span className="text-primary-foreground font-bold text-sm">RMS</span>
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-foreground">Management Dashboard</h1>
                                    <p className="text-sm text-muted-foreground">{nameFromTenant ?? userData.restaurantName}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                onClick={backToLanding}
                                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                            >
                                <Home className="h-4 w-4" />
                                Home
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as typeof activeTab)} className="space-y-8">
                    <TabsList className="grid w-full grid-cols-5 lg:w-fit lg:grid-cols-5">
                        <TabsTrigger value="analytics" className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            <span className="hidden sm:inline">Analytics</span>
                        </TabsTrigger>
                        <TabsTrigger value="staff" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="hidden sm:inline">Staff</span>
                        </TabsTrigger>
                        <TabsTrigger value="inventory" className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span className="hidden sm:inline">Inventory</span>
                        </TabsTrigger>
                        <TabsTrigger value="reservations" className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span className="hidden sm:inline">Reservations</span>
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            <span className="hidden sm:inline">Settings</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Analytics */}
                    <TabsContent value="analytics" className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">Business Analytics</h2>

                            <CardGrid cols={{ base: 1, md: 3 }} gap="gap-6" className="mb-8">
                                <StatCard
                                  label="Revenue"
                                  value={`$${analyticsData.revenue.today.toLocaleString()}`}
                                  change={`+${analyticsData.revenue.change}% from yesterday`}
                                  trend="up"
                                  icon={<DollarSign className="h-6 w-6 text-muted-foreground" />}
                                />
                                <StatCard
                                  label="Orders"
                                  value={analyticsData.orders.today}
                                  change={`+${analyticsData.orders.change}% from yesterday`}
                                  trend="up"
                                  icon={<TrendingUp className="h-6 w-6 text-muted-foreground" />}
                                />
                                <StatCard
                                  label="Customers"
                                  value={analyticsData.customers.today}
                                  change={`+${analyticsData.customers.change}% from yesterday`}
                                  trend="up"
                                  icon={<Users className="h-6 w-6 text-muted-foreground" />}
                                />
                            </CardGrid>

                            <CardGrid cols={{ base: 1, lg: 2 }} gap="gap-6">
                                <Card className="h-full">
                                    <CardHeader>
                                        <CardTitle>Sales Trend</CardTitle>
                                        <CardDescription>Revenue over the last 7 days</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
                                            <div className="text-center text-muted-foreground">
                                                <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                                                <p>Chart visualization would go here</p>
                                                <p className="text-sm">Revenue trending upward 12.5%</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="h-full">
                                    <CardHeader>
                                        <CardTitle>Popular Items</CardTitle>
                                        <CardDescription>Best selling menu items this week</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span>Margherita Pizza</span>
                                                <Badge>127 orders</Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Caesar Salad</span>
                                                <Badge>89 orders</Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Grilled Salmon</span>
                                                <Badge>76 orders</Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>Chicken Parmesan</span>
                                                <Badge>64 orders</Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </CardGrid>
                        </div>
                    </TabsContent>

                    {/* Staff */}
                    <TabsContent value="staff" className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">Staff Management</h2>

                            {/* Summary stats */}
                            <CardGrid cols={{ base: 1, sm: 3 }} gap="gap-4">
                              <StatCard label="On Duty" value={8} trend="neutral" />
                              <StatCard label="Arriving Soon" value={2} trend="neutral" />
                              <StatCard label="Total Staff" value={14} trend="neutral" />
                            </CardGrid>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Current Staff Status</CardTitle>
                                    <CardDescription>Overview of all staff members and their current status</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <StaffUsersCard />
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="menu" className="space-y-8">
                        <h2 className="text-2xl font-bold">Menu</h2>
                        <MenuItemsCard canWrite />
                    </TabsContent>

                    {/* Inventory */}
                    <TabsContent value="inventory" className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">Inventory Management</h2>

                            {/* Summary stats */}
                            <CardGrid cols={{ base: 1, sm: 3 }} gap="gap-4">
                              <StatCard label="Low Stock" value={5} trend="neutral" />
                              <StatCard label="Items" value={128} trend="neutral" />
                              <StatCard label="Suppliers" value={9} trend="neutral" />
                            </CardGrid>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Current Stock Levels</CardTitle>
                                    <CardDescription>Monitor inventory levels and receive low stock alerts</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <InventoryStockCard />
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Reservations */}
                    <TabsContent value="reservations" className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">Reservations</h2>
                            {(() => {
                              const total = reservationsData.length;
                              const confirmed = reservationsData.filter(r => r.status === 'confirmed').length;
                              const pending = reservationsData.filter(r => r.status === 'pending').length;
                              return (
                                <CardGrid cols={{ base: 1, sm: 3 }} gap="gap-4" className="mb-6">
                                  <StatCard label="Total" value={total} trend="neutral" />
                                  <StatCard label="Confirmed" value={confirmed} change={`${confirmed}/${total}`} trend="neutral" />
                                  <StatCard label="Pending" value={pending} change={`${pending}/${total}`} trend="neutral" />
                                </CardGrid>
                              );
                            })()}

                            <Card>
                                <CardHeader>
                                    <CardTitle>Today's Reservations</CardTitle>
                                    <CardDescription>Manage table bookings and customer reservations</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {reservationsData.map((r) => (
                                            <div key={r.id} className="flex items-center justify-between p-4 bg-accent/20 rounded-lg">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                                        <Users className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-foreground">{r.name}</h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            {r.time} • Party of {r.party} • Table {r.table}
                                                        </p>
                                                    </div>
                                                </div>

                                                <Badge className={getStatusColor(r.status)}>{r.status}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Settings */}
                    <TabsContent value="settings" className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">Restaurant Settings</h2>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Restaurant Information</CardTitle>
                                        <CardDescription>Basic information about your restaurant</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Building2 className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{userData.restaurantName}</p>
                                                <p className="text-sm text-muted-foreground">Restaurant Name</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <User className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{userData.firstName} {userData.lastName}</p>
                                                <p className="text-sm text-muted-foreground">Owner/Manager</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {/* Add MapPin when address added */}
                                            <div>
                                                <p className="font-medium">{userData.address ?? "123 Main St, City, ST"}</p>
                                                <p className="text-sm text-muted-foreground">Address</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {/* Phone */}
                                            <div>
                                                <p className="font-medium">{userData.phone || "(555) 123-4567"}</p>
                                                <p className="text-sm text-muted-foreground">Phone Number</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>System Settings</CardTitle>
                                        <CardDescription>Configure your restaurant management system</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium">Operating Hours</h4>
                                            <p className="text-sm text-muted-foreground">Monday - Sunday: 11:00 AM - 10:00 PM</p>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="font-medium">Tax Rate</h4>
                                            <p className="text-sm text-muted-foreground">8.25%</p>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="font-medium">Currency</h4>
                                            <p className="text-sm text-muted-foreground">USD ($)</p>
                                        </div>
                                        <Button variant="outline" className="w-full">Edit Settings</Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
