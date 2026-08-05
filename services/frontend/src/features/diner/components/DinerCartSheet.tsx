import { ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useDinerCart } from "../cart/DinerCartProvider";
import { cartSubtotal } from "../cart/dinerCartTypes";
import { money } from "../money";
import { QuantityStepper } from "./ItemModifierDialog";

export function DinerCartSheet({
  open,
  onOpenChange,
  onCheckout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout: () => void;
}) {
  const { cart, setQuantity, remove } = useDinerCart();
  const subtotal = cartSubtotal(cart);
  const isEmpty = !cart || cart.lines.length === 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] max-w-[92vw] flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="text-[18px]">Your order</SheetTitle>
        </SheetHeader>

        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <ShoppingBag className="h-9 w-9" />
            <p className="text-sm">Your cart is empty</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {cart.lines.map((line) => (
                <div key={line.key} className="flex flex-col gap-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-medium leading-snug">{line.name}</h4>
                    <span className="font-numeric text-sm shrink-0">
                      {money(line.unitPrice * line.quantity)}
                    </span>
                  </div>

                  {line.optionsLabel && (
                    <p className="text-[13px] text-muted-foreground">{line.optionsLabel}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="font-numeric text-[13px] text-muted-foreground">
                      {money(line.unitPrice)} each
                    </span>
                    <div className="flex items-center gap-2">
                      <QuantityStepper
                        value={line.quantity}
                        onChange={(q) => setQuantity(line.key, q)}
                      />
                      <button
                        type="button"
                        aria-label={`Remove ${line.name}`}
                        onClick={() => remove(line.key)}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border px-5 py-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-[15px] font-semibold">
                <span>Subtotal</span>
                <span className="font-numeric">{money(subtotal)}</span>
              </div>
              {/* Tax and any service charge come from the server's pricing estimate at
                  checkout - deliberately not guessed here. */}
              <p className="text-[12px] text-muted-foreground -mt-2">
                Taxes and fees calculated at checkout.
              </p>
              <Button className="w-full" onClick={onCheckout}>
                Continue to Checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
