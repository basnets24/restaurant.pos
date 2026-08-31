import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Separator } from "../../../components/ui/separator";
import {
    Sheet,
    SheetContent,
} from "../../../components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import {
    X,
    ShoppingCart,
    CreditCard,
    Plus,
    Minus,
    Trash2,
    ReceiptText,
    MoreVertical,
} from "lucide-react";
import { Flame, Check, Loader2, Ban } from "lucide-react";
import { useKitchen } from "@/features/pos/kitchen/kitchenStore";

// ─────────────────────────────────────────────────────────────────────────────
// Props — deliberately narrower than the canonical domain Order/Table (types/pos):
// this sidebar is a view built from a cart + table lookup in MenuPage, not the
// full domain entities, and only ever renders these fields.
// ─────────────────────────────────────────────────────────────────────────────
export type SidebarOrderItem = {
    id: string;
    quantity: number;
    notes?: string | null;
    menuItem: { name: string; price: number };
};

export type SidebarOrderEstimate = {
    subtotal: number;
    discountTotal: number;
    serviceChargeTotal: number;
    taxTotal: number;
    grandTotal: number;
};

export type SidebarOrder = {
    id: string;
    items: SidebarOrderItem[];
    // Server-computed via the real PricingService config (tax rate, service
    // charges, discounts) - absent only while the cart is still empty.
    estimate?: SidebarOrderEstimate | null;
};

export type SidebarTable = {
    id: string;
    number: string | number;
    section?: string;
};

interface OrderSidebarProps {
    order: SidebarOrder | null;
    table: SidebarTable | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdateItem: (itemId: string, quantity: number) => void;
    onRemoveItem: (itemId: string) => void;
    // Matches POSShell usage: no argument needed
    onFire: () => void | Promise<void>;
    onPay: () => void;
    onCancel?: () => void;
    isCancellable?: boolean;
    isMobile?: boolean;
    firing?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact −/qty/+ stepper (Spoontab cart rail)
// ─────────────────────────────────────────────────────────────────────────────
function Stepper({
                     value,
                     onChange,
                     min = 0,
                     max = 99,
                     disabled = false,
                 }: {
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    disabled?: boolean;
}) {
    const btn =
        "h-[26px] w-[26px] rounded-[7px] border border-border bg-background text-foreground " +
        "flex items-center justify-center transition-colors hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none";
    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => onChange(value - 1)}
                disabled={disabled || value <= min}
                className={btn}
            >
                <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-[18px] text-center text-sm font-semibold font-numeric text-foreground">
                {value}
            </span>
            <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => onChange(value + 1)}
                disabled={disabled || value >= max}
                className={btn}
            >
                <Plus className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small row component for a single order item
// ─────────────────────────────────────────────────────────────────────────────
function OrderItemRow({
                          item,
                          onUpdateQuantity,
                          onRemove,
                          disabled,
                      }: {
    item: SidebarOrderItem;
    onUpdateQuantity: (quantity: number) => void;
    onRemove: () => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
                {/* Item name stays an <h4> — matched by the POS ordering E2E spec */}
                <h4 className="text-sm font-medium text-foreground truncate">
                    {item.menuItem.name}
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground font-numeric">
                    ${item.menuItem.price.toFixed(2)} each
                </p>
                {item.notes && (
                    <p className="mt-1 text-xs text-muted-foreground italic truncate">
                        {item.notes}
                    </p>
                )}
                <div className="mt-2">
                    {/* min 1: minus at 1 hands off to the trash affordance for removal */}
                    <Stepper
                        value={item.quantity}
                        min={1}
                        onChange={onUpdateQuantity}
                        disabled={disabled}
                    />
                </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-sm font-medium font-numeric text-foreground">
                    ${(item.menuItem.price * item.quantity).toFixed(2)}
                </span>
                <button
                    type="button"
                    aria-label={`Remove ${item.menuItem.name}`}
                    onClick={onRemove}
                    disabled={disabled}
                    className="text-muted-foreground/70 hover:text-destructive transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
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
                                 onFire,
                                 onPay,
                                 onCancel,
                                 isCancellable,
                                 firing,
                             }: Omit<OrderSidebarProps, "isOpen" | "isMobile">) {
    const kitchen = useKitchen();
    if (!table) return null;

    // Prefer the server-computed estimate (real configured tax rate + any
    // service charges/discounts from PricingService) over a client-side
    // guess - only falls back to a subtotal-only figure for the brief moment
    // before the cart's first estimate has loaded.
    const subtotal =
        order?.estimate?.subtotal ??
        order?.items.reduce((sum, it) => sum + it.menuItem.price * it.quantity, 0) ??
        0;
    const discount = order?.estimate?.discountTotal ?? 0;
    const serviceCharge = order?.estimate?.serviceChargeTotal ?? 0;
    const tax = order?.estimate?.taxTotal ?? 0;
    const total = order?.estimate?.grandTotal ?? subtotal;

    const itemCount = order?.items.reduce((n, it) => n + it.quantity, 0) ?? 0;
    const isFired = order ? kitchen.isFired(order.id) : false;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-5">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-[8px] bg-brand-soft text-brand-strong flex items-center justify-center shrink-0">
                        <ReceiptText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-[15px] text-foreground truncate">
                            Table <span className="font-numeric">{table.number}</span>
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                            {table.section ?? "N/A"}
                            {itemCount > 0 && ` · ${itemCount} item${itemCount === 1 ? "" : "s"}`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {isCancellable && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={onCancel}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Ban className="h-4 w-4 mr-2" /> Void Order
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="h-8 w-8 p-0"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Separator className="mt-4" />

            {/* Order Items */}
            <div className="flex-1 overflow-y-auto">
                {!order || order.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                        <ShoppingCart className="h-8 w-8 text-muted-foreground mb-3" />
                        <h4 className="font-semibold text-foreground mb-1">No items yet</h4>
                        <p className="text-sm text-muted-foreground max-w-[16rem]">
                            Start adding items from the menu to build this order.
                        </p>
                    </div>
                ) : (
                    <div className="px-5 py-4 flex flex-col gap-4">
                        {order.items.map((item) => (
                            <OrderItemRow
                                key={item.id}
                                item={item}
                                onUpdateQuantity={(quantity) =>
                                    onUpdateItem(item.id, quantity)
                                }
                                onRemove={() => onRemoveItem(item.id)}
                                disabled={isFired}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Fire to Kitchen + Order Summary & Checkout */}
            {order && order.items.length > 0 && (
                <div className="border-t border-border p-5 bg-card">
                    <div className="space-y-1.5 mb-3">
                        <div className="flex justify-between text-[13px] text-muted-foreground">
                            <span>Subtotal</span>
                            <span className="font-numeric">${subtotal.toFixed(2)}</span>
                        </div>
                        {discount > 0 && (
                            <div className="flex justify-between text-[13px] text-muted-foreground">
                                <span>Discount</span>
                                <span className="font-numeric">-${discount.toFixed(2)}</span>
                            </div>
                        )}
                        {serviceCharge > 0 && (
                            <div className="flex justify-between text-[13px] text-muted-foreground">
                                <span>Service charge</span>
                                <span className="font-numeric">${serviceCharge.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-[13px] text-muted-foreground">
                            <span>Tax</span>
                            <span className="font-numeric">${tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-baseline pt-1 font-semibold text-[17px] text-foreground">
                            <span>Total</span>
                            <span className="font-numeric">${total.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Fire to Kitchen — this is what actually creates the order and
                        reserves inventory; payment happens later, separately, below. */}
                    <Button
                        type="button"
                        variant={isFired ? "outline" : "default"}
                        disabled={isFired || firing || order.items.length === 0}
                        onClick={onFire}
                        className="w-full mb-2"
                    >
                        {isFired ? (
                            <>
                                <Check className="h-4 w-4 mr-2" /> Fired ✓
                            </>
                        ) : firing ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Firing…
                            </>
                        ) : (
                            <>
                                <Flame className="h-4 w-4 mr-2" /> Fire to Kitchen
                            </>
                        )}
                    </Button>

                    <Button
                        onClick={onPay}
                        variant="outline"
                        className="w-full"
                        disabled={!isFired}
                        title={!isFired ? "Fire the order to the kitchen before paying" : undefined}
                    >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay – ${total.toFixed(2)}
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
            <Card className="h-full overflow-hidden shadow-md border-border bg-card">
                <OrderSidebarContent {...props} />
            </Card>
        </div>
    );
}
