import type { OrderItem as POSOrderItem, Table as DiningTable } from "../types/pos"; // adjust path
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { CreditCard, MapPin, Users, ArrowLeft } from "lucide-react";

export interface CheckoutViewProps {
    orderItems: POSOrderItem[];
    selectedTable: DiningTable;
    totalPrice: number;
    onOrderComplete: () => void;
    onBackToOrder: () => void;
}

export function CheckoutView({
                                 orderItems,
                                 selectedTable,
                                 totalPrice,
                                 onOrderComplete,
                                 onBackToOrder,
                             }: CheckoutViewProps) {
    const taxRate = 0.085;
    const tax = totalPrice * taxRate;
    const grandTotal = totalPrice + tax;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={onBackToOrder} className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Order
                </Button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                        <span className="text-primary-foreground font-bold">{selectedTable.number}</span>
                    </div>
                    <div>
                        <div className="text-foreground font-medium">Table {selectedTable.number}</div>
                        <div className="flex items-center gap-4 text-muted-foreground text-sm">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {selectedTable.section}
              </span>
                            <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" /> {selectedTable.seats} seats
              </span>
                        </div>
                    </div>
                </div>
            </div>

            <Card className="shadow-lg border-border">
                <CardHeader className="bg-accent/30 border-b border-border">
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Checkout
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Items */}
                    <div className="space-y-3">
                        {orderItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{item.menuItem.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                        ${item.menuItem.price.toFixed(2)} × {item.quantity}
                                    </div>
                                </div>
                                <Badge className="bg-primary text-primary-foreground">
                                    ${(item.menuItem.price * item.quantity).toFixed(2)}
                                </Badge>
                            </div>
                        ))}
                    </div>

                    <Separator />

                    {/* Totals */}
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>${totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tax (8.5%)</span>
                            <span>${tax.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-lg font-semibold">
                            <span>Total</span>
                            <span>${grandTotal.toFixed(2)}</span>
                        </div>
                    </div>

                    <Button size="lg" className="w-full" onClick={onOrderComplete}>
                        Complete Payment
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
