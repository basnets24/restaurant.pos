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
    AlertTriangle,
    User,
    Building2,
} from "lucide-react";
import StaffUsersCard from "./StaffUsersCard";
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

   

    const inventoryData = [
        { item: "Chicken Breast", current: 5, unit: "lbs", minimum: 10, status: "low" },
        { item: "Fresh Basil", current: 2, unit: "bunches", minimum: 5, status: "critical" },
        { item: "Tomatoes", current: 25, unit: "lbs", minimum: 15, status: "good" },
        { item: "Mozzarella", current: 8, unit: "lbs", minimum: 10, status: "low" },
    ];

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
                                    <p className="text-sm text-muted-foreground">{userData.restaurantName}</p>
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

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            ${analyticsData.revenue.today.toLocaleString()}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            <span className="text-green-600">+{analyticsData.revenue.change}%</span> from yesterday
                                        </p>
                                        <div className="mt-4 space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span>This Week</span>
                                                <span>${analyticsData.revenue.week.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span>This Month</span>
                                                <span>${analyticsData.revenue.month.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Orders</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{analyticsData.orders.today}</div>
                                        <p className="text-xs text-muted-foreground">
                                            <span className="text-green-600">+{analyticsData.orders.change}%</span> from yesterday
                                        </p>
                                        <div className="mt-4 space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span>This Week</span>
                                                <span>{analyticsData.orders.week}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span>This Month</span>
                                                <span>{analyticsData.orders.month}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Customers</CardTitle>
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{analyticsData.customers.today}</div>
                                        <p className="text-xs text-muted-foreground">
                                            <span className="text-green-600">+{analyticsData.customers.change}%</span> from yesterday
                                        </p>
                                        <div className="mt-4 space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span>This Week</span>
                                                <span>{analyticsData.customers.week}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span>This Month</span>
                                                <span>{analyticsData.customers.month}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card>
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

                                <Card>
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
                            </div>
                        </div>
                    </TabsContent>

                    {/* Staff */}
                    <TabsContent value="staff" className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">Staff Management</h2>

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

                    {/* Inventory */}
                    <TabsContent value="inventory" className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">Inventory Management</h2>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Current Stock Levels</CardTitle>
                                    <CardDescription>Monitor inventory levels and receive low stock alerts</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {inventoryData.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-accent/20 rounded-lg">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                                        <Package className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-foreground">{item.item}</h4>
                                                        <p className="text-sm text-muted-foreground">Minimum: {item.minimum} {item.unit}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-sm font-medium">{item.current} {item.unit}</p>
                                                        <p className="text-sm text-muted-foreground">Available</p>
                                                    </div>
                                                    <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                                                    {item.status === "critical" && <AlertTriangle className="h-5 w-5 text-red-500" />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Reservations */}
                    <TabsContent value="reservations" className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">Reservations</h2>

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
