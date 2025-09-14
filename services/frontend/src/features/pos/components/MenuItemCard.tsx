import type { MenuItem as POSMenuItem } from "../../../types/pos"; // ← update path if yours differs
import { Card, CardContent, CardFooter } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Badge } from "../../../components/ui/badge";
import { Plus, Minus } from "lucide-react";
import { useState } from "react";

interface MenuItemCardProps {
    item: POSMenuItem;
    onAddToOrder: (
        menuItem: POSMenuItem,
        quantity?: number,
        notes?: string
    ) => void | Promise<void>;
}

export function MenuItemCard({ item, onAddToOrder }: MenuItemCardProps) {
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showNotes, setShowNotes] = useState(false);

    const handleAdd = async () => {
        setIsLoading(true);
        try {
            await onAddToOrder(item, quantity, notes.trim() || undefined);
            // Reset after successful add
            setQuantity(1);
            setNotes("");
            setShowNotes(false);
        } catch (err) {
            console.error("MenuItemCard: add failed", err);
        } finally {
            setIsLoading(false);
        }
    };

    const incrementQuantity = () => setQuantity((q) => Math.min(99, q + 1));
    const decrementQuantity = () => setQuantity((q) => Math.max(1, q - 1));

    const handleQuickAdd = async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            await onAddToOrder(item, 1);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="menu-item-card h-full min-h-[260px] flex flex-col hover:shadow-lg transition-all duration-200 border-border bg-card group">
            {/* Top: title + price, description */}
            <CardContent className="p-5 sm:p-6 lg:p-7 flex-1">
                <div
                    className="flex items-start justify-between gap-3 mb-2 cursor-pointer select-none"
                    onClick={handleQuickAdd}
                    role="button"
                    aria-label={`Add ${item.name} quickly`}
                >
                    <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground leading-snug">
                        {item.name}
                    </h3>
                    <Badge className="bg-primary text-primary-foreground px-2.5 py-1 text-sm font-medium shadow-sm shrink-0">
                        ${item.price.toFixed(2)}
                    </Badge>
                </div>

                {item.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mt-2" onClick={handleQuickAdd}>
                        {item.description}
                    </p>
                )}
            </CardContent>

            {/* Bottom: quantity + primary action + optional notes */}
            <CardFooter className="p-5 sm:p-6 lg:p-7 pt-0 flex flex-col gap-3">
                {/* Quantity controls */}
                <div className="flex items-center justify-between w-full">
                    <span className="text-sm text-muted-foreground">Quantity</span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={decrementQuantity}
                            disabled={quantity <= 1 || isLoading}
                            className="h-8 w-8 p-0"
                        >
                            <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium min-w-[2ch] text-center">
                            {quantity}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={incrementQuantity}
                            disabled={quantity >= 99 || isLoading}
                            className="h-8 w-8 p-0"
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                {/* Primary action */}
                <Button
                    onClick={handleAdd}
                    disabled={isLoading}
                    className="w-full shadow-sm hover:shadow-md transition-all duration-200 text-base py-5"
                    size="lg"
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                            Adding...
                        </div>
                    ) : (
                        <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add {quantity > 1 ? `${quantity}× ` : ""}to Order
                        </>
                    )}
                </Button>

                {/* Special instructions (demoted) */}
                {showNotes ? (
                    <Textarea
                        placeholder="Special instructions (optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="text-xs resize-none"
                        rows={2}
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowNotes(true)}
                        className="self-start text-xs text-muted-foreground hover:text-foreground"
                    >
                        + Add special instructions
                    </button>
                )}
            </CardFooter>
        </Card>
    );
}
