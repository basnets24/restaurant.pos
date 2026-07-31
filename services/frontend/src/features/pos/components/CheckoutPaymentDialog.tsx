import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { useOrder, useRequestPayment } from "@/domain/orders/hooks";
import { pollForClientSecret } from "@/domain/payments/api";
import { StripeElementsForm } from "./StripeCheckoutDialog";
import { errorMessage } from "@/lib/apiErrors";

type CheckoutPaymentDialogProps = {
  open: boolean;
  /** Order created by cart checkout — its total is fetched for the summary. */
  orderId: string;
  onOpenChange: (open: boolean) => void;
  /**
   * Side effects to run once payment is server-verified as succeeded (e.g.
   * releasing the table). The dialog stays open on a success confirmation
   * card afterwards — dismissing it (or "Back to Tables") is what routes away.
   */
  onPaid: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Inline checkout dialog: shows the placed order's total with a "Pay Now"
// button, then swaps to the embedded Stripe PaymentElement once a client
// secret is ready — so the whole pay flow happens here instead of routing out
// to the order/success pages.
// ─────────────────────────────────────────────────────────────────────────────
export function CheckoutPaymentDialog({
  open,
  orderId,
  onOpenChange,
  onPaid,
}: CheckoutPaymentDialogProps) {
  const { data: order } = useOrder(orderId || undefined);
  const requestPayment = useRequestPayment();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);

  const total = order?.grandTotal ?? null;

  async function handlePayNow() {
    if (!orderId) return;
    setPaying(true);
    try {
      // Kick off the saga's payment request, then poll for the PaymentIntent
      // client secret the payment service publishes back (same as OrderPage).
      await requestPayment.mutateAsync(orderId);
      const cs = await pollForClientSecret(orderId, 12_000, 600);
      if (cs) {
        setClientSecret(cs);
      } else {
        toast.error("Payment session not ready yet. Please try again.");
      }
    } catch (e: unknown) {
      toast.error(errorMessage(e) || "Could not start payment.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {done ? "Payment complete" : clientSecret ? "Card details" : "Payment"}
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center text-center pt-2">
            <div className="w-14 h-14 rounded-full bg-status-available-soft border-2 border-status-available flex items-center justify-center mb-4">
              <Check className="h-7 w-7 text-status-available" />
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {total != null ? (
                <>
                  <span className="font-numeric">${total.toFixed(2)}</span> paid · order sent to the kitchen
                </>
              ) : (
                "Payment received · order sent to the kitchen"
              )}
            </p>
            <Button className="w-full" size="lg" onClick={() => onOpenChange(false)}>
              Back to Tables
            </Button>
          </div>
        ) : clientSecret ? (
          <StripeElementsForm
            orderId={orderId}
            clientSecret={clientSecret}
            onSuccess={() => {
              setDone(true);
              onPaid();
            }}
            onFailure={(m) => toast.error(m)}
          />
        ) : (
          <div className="space-y-5">
            {order && order.items.length > 0 && (
              <div className="space-y-2">
                {order.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      {it.quantity}× {it.menuItemName}
                    </span>
                    <span className="font-numeric">
                      ${(it.quantity * it.unitPrice).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <span className="font-semibold">Total due</span>
              <span className="font-numeric text-lg font-semibold">
                {total != null ? `$${total.toFixed(2)}` : "—"}
              </span>
            </div>

            <Button className="w-full" size="lg" onClick={handlePayNow} disabled={paying}>
              {paying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting payment…
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" /> Pay Now
                  {total != null ? ` — $${total.toFixed(2)}` : ""}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
