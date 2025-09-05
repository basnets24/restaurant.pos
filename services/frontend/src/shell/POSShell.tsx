import { useEffect, useMemo, useState } from "react";
import type {
    Table as DiningTable,
    Order as POSOrder,
    OrderItem as POSOrderItem,
    MenuItem as POSMenuItem,
} from "../types/pos";

// UI
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "../components/ui/sheet";
import { Card, CardContent } from "../components/ui/card";
import {
    Home,
    Menu as MenuIcon,
    ShoppingCart,
    CreditCard,
    MoreHorizontal,
    Users,
} from "lucide-react";
import { Toaster } from "sonner";

// Screens
import { DraggableTableManagementView } from "../components/TableManagementView";
import { OrderView } from "../components/OrderView";
import { CheckoutView } from "../components/CheckoutView";

// -----------------------------------------
// Simple inline MenuView (keeps router tidy)
// Replace with your full MenuView when ready
// -----------------------------------------
function MenuView({ onAddToOrder }: { onAddToOrder: (item: POSMenuItem) => void }) {
    const demoMenu: POSMenuItem[] = useMemo(
        () => [
            {
                id: "11111111-1111-1111-1111-111111111111",
                name: "Margherita Pizza",
                price: 12,
                category: "appetizers",
                description: "San Marzano, basil, fior di latte",
            },
            {
                id: "22222222-2222-2222-2222-222222222222",
                name: "Caesar Salad",
                price: 9.5,
                category: "mains",
                description: "Romaine, parmigiano, focaccia crumbs",
            },
            {
                id: "33333333-3333-3333-3333-333333333333",
                name: "Iced Tea",
                price: 3.25,
                category: "drinks",
                description: "Lemon, lightly sweetened",
            },
        ],
        [],
    );

    return (
        <Card>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {demoMenu.map((m) => (
                    <Button key={m.id} variant="outline" onClick={() => onAddToOrder(m)}>
                        Add {m.name} – ${m.price.toFixed(2)}
                    </Button>
                ))}
            </CardContent>
        </Card>
    );
}

// -------------------- helpers --------------------
const newId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : "id-" + Math.random().toString(36).slice(2);

// -------------------- main shell --------------------
type Route = "table-selection" | "menu" | "order" | "checkout";

export default function POSShell({
                                     userData,
                                     onBackToDashboard,
                                 }: {
    userData: { restaurantName?: string } | null;
    onBackToDashboard: () => void;
}) {
    const [tables, setTables] = useState<DiningTable[]>([]);
    const [orders, setOrders] = useState<POSOrder[]>([]);
    const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
    const [route, setRoute] = useState<Route>("table-selection");

    // UI state
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState<boolean>(() =>
        typeof window !== "undefined" ? window.innerWidth < 1024 : false,
    );

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    // -------- table management ----------
    const updateTableStatus = (
        tableId: string,
        status: DiningTable["status"],
        partySize?: number,
    ) => {
        setTables((prev) =>
            prev.map((t) =>
                t.id === tableId
                    ? { ...t, status, partySize: status === "available" ? undefined : partySize ?? t.partySize }
                    : t,
            ),
        );
    };

    const updateTables = (newTables: DiningTable[]) => setTables(newTables);

    const selectTable = (table: DiningTable) => {
        setSelectedTable(table);
        setRoute("menu");
    };

    // -------- orders ----------
    const getOrderByTableId = (tableId: string) =>
        orders.find((o) => o.tableId === tableId && o.status === "open") || null;

    const getCurrentOrder = (): POSOrder | null =>
        selectedTable ? getOrderByTableId(selectedTable.id) : null;

    const getCurrentOrderItems = (): POSOrderItem[] => getCurrentOrder()?.items ?? [];

    const getActiveOrders = (): POSOrder[] => orders.filter((o) => o.status === "open");

    const getTableByOrderId = (orderId: string): DiningTable | null => {
        const o = orders.find((x) => x.id === orderId);
        if (!o) return null;
        return tables.find((t) => t.id === o.tableId) || null;
    };

    const getTotalItems = () => getCurrentOrderItems().reduce((sum, i) => sum + i.quantity, 0);
    const getTotalPrice = () =>
        getCurrentOrderItems().reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0);

    const addToOrder = (menuItem: POSMenuItem) => {
        if (!selectedTable) return;
        setOrders((prev) => {
            // existing open order for the table?
            const existing = prev.find((o) => o.tableId === selectedTable.id && o.status === "open");
            const order: POSOrder =
                existing ??
                ({
                    id: newId(),
                    tableId: selectedTable.id,
                    items: [],
                    total: 0,
                    status: "open",
                } as POSOrder);

            const items = [...order.items];
            const ix = items.findIndex((i) => i.menuItem.id === menuItem.id);
            if (ix >= 0) items[ix] = { ...items[ix], quantity: items[ix].quantity + 1 };
            else items.push({ id: newId(), menuItem, quantity: 1 });

            const total = items.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
            const updated = { ...order, items, total };

            if (existing) {
                return prev.map((o) => (o.id === existing.id ? updated : o));
            }
            return [...prev, updated];
        });
        setRoute("order");
    };

    const updateOrderItem = (itemId: string, qty: number) => {
        if (!selectedTable) return;
        setOrders((prev) =>
            prev.map((o) => {
                if (o.tableId !== selectedTable.id || o.status !== "open") return o;
                const items = o.items.map((it) => (it.id === itemId ? { ...it, quantity: qty } : it));
                const total = items.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
                return { ...o, items, total };
            }),
        );
    };

    const removeOrderItem = (itemId: string) => {
        if (!selectedTable) return;
        setOrders((prev) =>
            prev.map((o) => {
                if (o.tableId !== selectedTable.id || o.status !== "open") return o;
                const items = o.items.filter((it) => it.id !== itemId);
                const total = items.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
                return { ...o, items, total };
            }),
        );
    };

    const selectOrderFromNav = (orderId: string) => {
        const table = getTableByOrderId(orderId);
        if (!table) return;
        setSelectedTable(table);
        setRoute("order");
    };

    // -------- checkout ----------
    const [checkoutOrderId, setCheckoutOrderId] = useState<string | null>(null);
    const getCurrentCheckoutOrderId = () => checkoutOrderId;

    const navigateToCheckout = () => {
        const o = getCurrentOrder();
        if (!o || o.items.length === 0) return;
        setCheckoutOrderId(o.id);
        setRoute("checkout");
    };

    const completeOrder = (orderId: string) => {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "paid" } : o)));
        setSelectedTable(null);
        setRoute("table-selection");
        setCheckoutOrderId(null);
        setSidebarOpen(false);
    };

    // demo seed tables (once)
    useEffect(() => {
        if (tables.length) return;
        const initial: DiningTable[] = [
            {
                id: newId(),
                number: "1",
                section: "Window Side",
                seats: 2,
                shape: "round",
                status: "available",
                position: { x: 60, y: 120 },
                size: { width: 80, height: 80 },
                version: 0,
            },
            {
                id: newId(),
                number: "5",
                section: "Center",
                seats: 4,
                shape: "round",
                status: "available",
                position: { x: 280, y: 100 },
                size: { width: 100, height: 100 },
                version: 0,
            },
            {
                id: newId(),
                number: "10",
                section: "Bar Area",
                seats: 2,
                shape: "square",
                status: "occupied",
                partySize: 2,
                position: { x: 720, y: 80 },
                size: { width: 70, height: 70 },
                version: 0,
            },
        ];
        setTables(initial);
    }, [tables.length]);

    // -------- render --------
    return (
        <div className="flex min-h-screen flex-col bg-background">
            {/* HEADER */}
            <header className="bg-card shadow-lg shadow-primary/10 border-b border-border px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={onBackToDashboard}
                            className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                        >
                            <span className="text-primary-foreground font-bold text-sm sm:text-base">POS</span>
                        </button>
                        <div>
                            <button
                                onClick={onBackToDashboard}
                                className="text-left hover:text-primary transition-colors duration-200"
                            >
                                <h1 className="text-lg sm:text-xl text-foreground">
                                    {userData?.restaurantName || "Restaurant"} POS
                                </h1>
                            </button>
                            <div className="flex items-center gap-2">
                                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Point of Sale System</p>
                                {selectedTable && (
                                    <>
                                        <span className="text-muted-foreground hidden sm:block">•</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-primary font-medium">Table {selectedTable.number}</span>
                                            <span className="text-xs text-muted-foreground hidden sm:inline">
                        ({selectedTable.section})
                      </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden lg:flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={onBackToDashboard}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <Home className="h-4 w-4" />
                            Dashboard
                        </Button>

                        <Button
                            variant={route === "table-selection" ? "default" : "outline"}
                            onClick={() => setRoute("table-selection")}
                            className="flex items-center gap-2"
                        >
                            <Users className="h-4 w-4" />
                            Tables
                        </Button>

                        <Button
                            variant={route === "menu" ? "default" : "outline"}
                            onClick={() => setRoute("menu")}
                            disabled={!selectedTable}
                            className="flex items-center gap-2 disabled:opacity-50"
                        >
                            <MenuIcon className="h-4 w-4" />
                            Menu
                        </Button>

                        {/* Active Orders */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="flex items-center gap-2 relative">
                                    <ShoppingCart className="h-4 w-4" />
                                    Orders
                                    {getActiveOrders().length > 0 && (
                                        <Badge
                                            variant="destructive"
                                            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive"
                                        >
                                            {getActiveOrders().length}
                                        </Badge>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                                {getActiveOrders().length === 0 ? (
                                    <div className="p-4 text-center text-muted-foreground text-sm">No active orders</div>
                                ) : (
                                    getActiveOrders().map((order) => {
                                        const table = getTableByOrderId(order.id);
                                        if (!table) return null;
                                        return (
                                            <DropdownMenuItem
                                                key={order.id}
                                                onClick={() => selectOrderFromNav(order.id)}
                                                className="flex items-center justify-between p-3 cursor-pointer"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                                        <span className="text-primary-foreground text-xs font-bold">{table.number}</span>
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm">Table {table.number}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {order.items.length} items • ${order.total.toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    {table.partySize || "?"}
                                                </Badge>
                                            </DropdownMenuItem>
                                        );
                                    })
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant={route === "order" ? "default" : "outline"}
                            onClick={() => setRoute("order")}
                            disabled={!selectedTable}
                            className="flex items-center gap-2 relative disabled:opacity-50"
                        >
                            <ShoppingCart className="h-4 w-4" />
                            Current Order
                            {getTotalItems() > 0 && (
                                <Badge
                                    variant="destructive"
                                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive"
                                >
                                    {getTotalItems()}
                                </Badge>
                            )}
                        </Button>

                        <Button
                            variant={route === "checkout" ? "default" : "outline"}
                            onClick={navigateToCheckout}
                            disabled={getCurrentOrderItems().length === 0 || !selectedTable}
                            className="flex items-center gap-2 disabled:opacity-50"
                        >
                            <CreditCard className="h-4 w-4" />
                            Checkout
                        </Button>
                    </div>

                    {/* Mobile Nav */}
                    <div className="flex lg:hidden items-center gap-2">
                        {selectedTable && getTotalItems() > 0 && (
                            <Button size="sm" variant="outline" onClick={() => setSidebarOpen(true)} className="relative">
                                <ShoppingCart className="h-4 w-4" />
                                <Badge
                                    variant="destructive"
                                    className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-xs bg-destructive"
                                >
                                    {getTotalItems()}
                                </Badge>
                            </Button>
                        )}

                        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="sm" className="lg:hidden">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-72">
                                <div className="flex flex-col gap-4 mt-6">
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            onBackToDashboard();
                                            setMobileMenuOpen(false);
                                        }}
                                        className="flex items-center gap-2 justify-start text-muted-foreground hover:text-foreground"
                                    >
                                        <Home className="h-4 w-4" />
                                        Dashboard
                                    </Button>

                                    <Button
                                        variant={route === "table-selection" ? "default" : "outline"}
                                        onClick={() => {
                                            setRoute("table-selection");
                                            setMobileMenuOpen(false);
                                        }}
                                        className="flex items-center gap-2 justify-start"
                                    >
                                        <Users className="h-4 w-4" />
                                        Tables
                                    </Button>

                                    <Button
                                        variant={route === "menu" ? "default" : "outline"}
                                        onClick={() => {
                                            setRoute("menu");
                                            setMobileMenuOpen(false);
                                        }}
                                        disabled={!selectedTable}
                                        className="flex items-center gap-2 justify-start disabled:opacity-50"
                                    >
                                        <MenuIcon className="h-4 w-4" />
                                        Menu
                                    </Button>

                                    <Button
                                        variant={route === "order" ? "default" : "outline"}
                                        onClick={() => {
                                            setRoute("order");
                                            setMobileMenuOpen(false);
                                        }}
                                        disabled={!selectedTable}
                                        className="flex items-center gap-2 relative justify-start disabled:opacity-50"
                                    >
                                        <ShoppingCart className="h-4 w-4" />
                                        Current Order
                                        {getTotalItems() > 0 && (
                                            <Badge variant="secondary" className="text-xs ml-auto">
                                                {getTotalItems()}
                                            </Badge>
                                        )}
                                    </Button>

                                    <Button
                                        variant={route === "checkout" ? "default" : "outline"}
                                        onClick={() => {
                                            navigateToCheckout();
                                            setMobileMenuOpen(false);
                                        }}
                                        disabled={getCurrentOrderItems().length === 0 || !selectedTable}
                                        className="flex items-center gap-2 justify-start disabled:opacity-50"
                                    >
                                        <CreditCard className="h-4 w-4" />
                                        Checkout
                                    </Button>

                                    {getActiveOrders().length > 0 && (
                                        <div className="border-t pt-4 mt-4">
                                            <h3 className="font-medium mb-3 text-sm">Active Orders</h3>
                                            <div className="space-y-2">
                                                {getActiveOrders().map((order) => {
                                                    const table = getTableByOrderId(order.id);
                                                    if (!table) return null;
                                                    return (
                                                        <Button
                                                            key={order.id}
                                                            variant="outline"
                                                            onClick={() => {
                                                                selectOrderFromNav(order.id);
                                                                setMobileMenuOpen(false);
                                                            }}
                                                            className="w-full justify-between h-auto p-3"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                                                                    <span className="text-primary-foreground text-xs font-bold">{table.number}</span>
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="font-medium text-sm">Table {table.number}</div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {order.items.length} items • ${order.total.toFixed(2)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Badge variant="outline" className="text-xs">
                                                                {table.partySize || "?"}
                                                            </Badge>
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </header>

            {/* MAIN */}
            <main
                className={`flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full ${
                    sidebarOpen && !isMobile ? "lg:pr-80 xl:pr-96" : ""
                } transition-all duration-300 overflow-x-hidden`}
            >
                {route === "table-selection" && (
                    <DraggableTableManagementView
                        tables={tables}
                        onSelectTable={selectTable}
                        onUpdateTableStatus={updateTableStatus}
                        onUpdateTables={updateTables}
                    />
                )}

                {route === "menu" && selectedTable && <MenuView onAddToOrder={addToOrder} />}

                {route === "order" && selectedTable && (
                    <OrderView
                        orderItems={getCurrentOrderItems()}
                        selectedTable={selectedTable}
                        onUpdateItem={updateOrderItem}
                        onRemoveItem={removeOrderItem}
                        onChangeTable={() => setRoute("table-selection")}
                        onProceedToCheckout={navigateToCheckout}
                    />
                )}

                {route === "checkout" &&
                    (() => {
                        const id = getCurrentCheckoutOrderId();
                        const order = id ? orders.find((o) => o.id === id) : null;
                        const table = order ? tables.find((t) => t.id === order.tableId) : null;
                        return order && table ? (
                            <CheckoutView
                                orderItems={order.items}
                                selectedTable={table}
                                totalPrice={order.total}
                                onOrderComplete={() => completeOrder(order.id)}
                                onBackToOrder={() => {
                                    setSelectedTable(table);
                                    setRoute("order");
                                }}
                            />
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">Order not found</p>
                            </div>
                        );
                    })()}
            </main>

            {/* Floating order button (desktop preview) */}
            {!sidebarOpen && getCurrentOrder() && route !== "checkout" && !isMobile && (
                <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end gap-2">
                    {getTotalPrice() > 0 && (
                        <div className="hidden sm:block bg-card border border-border rounded-lg px-3 py-2 shadow-md">
                            <div className="text-xs text-muted-foreground">Total</div>
                            <div className="font-medium">${getTotalPrice().toFixed(2)}</div>
                        </div>
                    )}
                    <Button
                        onClick={() => setSidebarOpen(true)}
                        className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg"
                        size="lg"
                    >
                        <div className="flex flex-col items-center relative">
                            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                            {getTotalItems() > 0 && (
                                <Badge
                                    variant="destructive"
                                    className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-xs bg-destructive"
                                >
                                    {getTotalItems()}
                                </Badge>
                            )}
                        </div>
                    </Button>
                </div>
            )}

            <Toaster />
        </div>
    );
}
