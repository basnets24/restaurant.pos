import type { OrderItem, Table } from "../types/pos";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
    Trash2,
    Plus,
    Minus,
    ShoppingCart,
    Users,
    MapPin,
    Edit3,
} from "lucide-react";
import { Separator } from "./ui/separator";

interface OrderViewProps {
    orderItems: OrderItem[];
    selectedTable: Table;
    onUpdateItem: (itemId: string, quantity: number) => void;
    onRemoveItem: (itemId: string) => void;
    onChangeTable: () => void;
    onProceedToCheckout: () => void;
}

export function OrderView({
                              orderItems,
                              selectedTable,
                              onUpdateItem,
                              onRemoveItem,
                              onChangeTable,
                              onProceedToCheckout,
                          }: OrderViewProps) {
    const totalPrice = orderItems.reduce(
        (sum, item) => sum + item.menuItem.price * item.quantity,
        0,
    );
    const totalItems = orderItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
    );

    const incrementQuantity = (
        itemId: string,
        currentQuantity: number,
    ) => {
        onUpdateItem(itemId, currentQuantity + 1);
    };

    const decrementQuantity = (
        itemId: string,
        currentQuantity: number,
    ) => {
        if (currentQuantity > 1) {
            onUpdateItem(itemId, currentQuantity - 1);
        }
    };

    if (orderItems.length === 0) {
        return (
            <div className="max-w-2xl mx-auto">
                <Card className="border-border shadow-lg">
                    <CardContent className="flex flex-col items-center justify-center py-20">
                        <div className="w-24 h-24 bg-accent rounded-2xl flex items-center justify-center mb-8 shadow-md">
                            <ShoppingCart className="h-12 w-12 text-accent-foreground" />
                        </div>
                        <h3 className="text-2xl mb-3 text-foreground">
                            Your order is empty
                        </h3>
                        <p className="text-muted-foreground text-center text-lg">
                            Add items from the menu to get started
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Table Info and Order Header */}
            <Card className="shadow-lg border-border">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-primary-foreground font-bold text-lg">
                  {selectedTable.number}
                </span>
                            </div>
                            <div>
                                <h2 className="text-xl text-foreground">
                                    Table {selectedTable.number}
                                </h2>
                                <div className="flex items-center gap-4 text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <MapPin className="h-4 w-4" />
                                        <span className="text-sm">
                      {selectedTable.section}
                    </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Users className="h-4 w-4" />
                                        <span className="text-sm">
                      {selectedTable.seats} seats
                    </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onChangeTable}
                            className="flex items-center gap-2"
                        >
                            <Edit3 className="h-4 w-4" />
                            Change Table
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl">Current Order</h3>
                    <p className="text-muted-foreground">
                        {totalItems} item{totalItems !== 1 ? "s" : ""} in
                        your order
                    </p>
                </div>
            </div>

            <Card className="shadow-lg border-border">
                <CardHeader className="bg-accent/30 border-b border-border">
                    <CardTitle className="flex items-center gap-3 text-foreground">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <ShoppingCart className="h-4 w-4 text-primary-foreground" />
                        </div>
                        Order Items
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {orderItems.map((item, index) => (
                        <div key={item.id}>
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <h4 className="text-base">
                                        {item.menuItem.name}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        ${item.menuItem.price.toFixed(2)} each
                                    </p>
                                    {item.notes && (
                                        <p className="text-sm text-primary mt-1">
                                            Note: {item.notes}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                decrementQuantity(
                                                    item.id,
                                                    item.quantity,
                                                )
                                            }
                                            disabled={item.quantity <= 1}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </Button>

                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => {
                                                const newQuantity =
                                                    parseInt(e.target.value) || 1;
                                                onUpdateItem(
                                                    item.id,
                                                    Math.max(1, newQuantity),
                                                );
                                            }}
                                            className="w-16 text-center"
                                            min="1"
                                        />

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                incrementQuantity(
                                                    item.id,
                                                    item.quantity,
                                                )
                                            }
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    <Badge className="min-w-[80px] text-center bg-primary text-primary-foreground shadow-sm">
                                        $
                                        {(
                                            item.menuItem.price * item.quantity
                                        ).toFixed(2)}
                                    </Badge>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onRemoveItem(item.id)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {index < orderItems.length - 1 && (
                                <Separator className="mt-4" />
                            )}
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="shadow-lg border-border">
                <CardHeader className="bg-accent/30 border-b border-border">
                    <CardTitle className="text-foreground">
                        Order Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>${totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tax (8.5%)</span>
                            <span>${(totalPrice * 0.085).toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-lg">
                            <span>Total</span>
                            <span>${(totalPrice * 1.085).toFixed(2)}</span>
                        </div>
                    </div>

                    <Button
                        onClick={onProceedToCheckout}
                        className="w-full mt-6"
                        size="lg"
                    >
                        Proceed to Checkout
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
