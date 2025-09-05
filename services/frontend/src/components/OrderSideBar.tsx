import type {
    Order as POSOrder,
    Table as DiningTable,
    OrderItem as POSOrderItem,
} from "../types/pos";

import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
    Sheet,
    SheetContent,
} from "./ui/sheet";
import {
    X,
    ShoppingCart,
    CreditCard,
    Users,
    Plus,
    Minus,
    Trash2,
    Receipt,
    Clock,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface OrderSidebarProps {
    order: POSOrder | null;
    table: DiningTable | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdateItem: (itemId: string, quantity: number) => void;
    onRemoveItem: (itemId: string) => void;
    // Matches POSShell usage: no argument needed
    onCheckout: () => void;
    isMobile?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small row component for a single order item
// ─────────────────────────────────────────────────────────────────────────────
function OrderItemRow({
                          item,
                          onUpdateQuantity,
                          onRemove,
                      }: {
    item: POSOrderItem;
    onUpdateQuantity: (quantity: number) => void;
    onRemove: () => void;
}) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">
                        {item.menuItem.name}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                        ${item.menuItem.price.toFixed(2)}
                    </Badge>
                </div>

                {item.notes && (
                    <p className="text-xs text-muted-foreground italic">
                        {item.notes}
                    </p>
                )}

                <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1 bg-secondary rounded-md">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onUpdateQuantity(Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                            className="h-6 w-6 p-0 hover:bg-background"
                        >
                            <Minus className="h-3 w-3" />
                        </Button>

                        <span className="px-2 text-sm font-medium min-w-[2rem] text-center">
              {item.quantity}
            </span>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onUpdateQuantity(item.quantity + 1)}
                            className="h-6 w-6 p-0 hover:bg-background"
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRemove}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            <div className="text-right ml-3">
                <div className="font-medium text-sm">
                    ${(item.menuItem.price * item.quantity).toFixed(2)}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar content
// ─────────────────────────────────────────────────────────────────────────────
function OrderSidebarContent({
                                 order,
                                 table,
                                 onClose,
                                 onUpdateItem,
                                 onRemoveItem,
                                 onCheckout,
                             }: Omit<OrderSidebarProps, "isOpen" | "isMobile">) {
    if (!table) return null;

    // compute money safely from order items
    const subtotal =
        order?.items.reduce(
            (sum, it) => sum + it.menuItem.price * it.quantity,
            0,
        ) ?? 0;

    const TAX_RATE = 0.08; // 8% (adjust if needed)
    const tax = +(subtotal * TAX_RATE).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);

    const hasCreatedAt =
        !!order && (order as any).createdAt instanceof Date;

    const formatTime = (date: Date) =>
        new Intl.DateTimeFormat("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        }).format(date);

    const getElapsedTime = (startDate: Date) => {
        const now = new Date();
        const elapsed = Math.floor(
            (now.getTime() - startDate.getTime()) / 60000,
        ); // minutes
        if (elapsed < 60) return `${elapsed}m`;
        const hours = Math.floor(elapsed / 60);
        const minutes = elapsed % 60;
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <Receipt className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div>
                        <h3 className="font-medium">Table {table.number}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{table.section}</span>
                            {table.partySize && (
                                <>
                                    <span>•</span>
                                    <div className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        <span>{table.partySize} guests</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 w-8 p-0"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Order Info (optional time) */}
            {order && hasCreatedAt && (
                <div className="px-4 py-3 bg-muted/30 border-b border-border">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                Started {formatTime((order as any).createdAt)}
              </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                            {getElapsedTime((order as any).createdAt)}
                        </Badge>
                    </div>
                </div>
            )}

            {/* Order Items */}
            <div className="flex-1 overflow-y-auto">
                {!order || order.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h4 className="font-medium mb-2">No items yet</h4>
                        <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                            Start adding items from the menu to build this order.
                        </p>
                        <Button variant="outline" size="sm" onClick={onClose}>
                            Browse Menu
                        </Button>
                    </div>
                ) : (
                    <div className="p-4">
                        {order.items.map((item) => (
                            <OrderItemRow
                                key={item.id}
                                item={item}
                                onUpdateQuantity={(quantity) =>
                                    onUpdateItem(item.id, quantity)
                                }
                                onRemove={() => onRemoveItem(item.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Order Summary & Checkout */}
            {order && order.items.length > 0 && (
                <div className="border-t border-border p-4 bg-card">
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
                            <span>${tax.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-medium">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                    </div>

                    <Button onClick={onCheckout} className="w-full" size="lg">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Checkout – ${total.toFixed(2)}
                    </Button>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Wrapper that renders a Sheet on mobile and a Card panel on desktop
// ─────────────────────────────────────────────────────────────────────────────
export function OrderSidebar(props: OrderSidebarProps) {
    const { isOpen, isMobile = false } = props;

    if (isMobile) {
        return (
            <Sheet
                open={isOpen}
                onOpenChange={(open) => {
                    if (!open) props.onClose();
                }}
            >
                <SheetContent side="right" className="w-full sm:max-w-sm p-0">
                    <OrderSidebarContent {...props} />
                </SheetContent>
            </Sheet>
        );
    }

    if (!isOpen) return null;

    return (
        <div className="fixed right-4 sm:right-6 top-20 sm:top-24 bottom-4 sm:bottom-6 w-72 lg:w-80 xl:w-96 z-40">
            <Card className="h-full shadow-xl border-border bg-card">
                <OrderSidebarContent {...props} />
            </Card>
        </div>
    );
}
