import { useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation, type Location } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Receipt, CheckCircle2, AlertTriangle } from "lucide-react";

import { useOrder, useRequestPayment } from "@/domain/orders/hooks";
import { pollForClientSecret } from "@/domain/payments/api";
import { StripeCheckoutDialog } from "@/features/pos/components/StripeCheckoutDialog";
import { useSetTableStatus, useUnlinkOrder } from "@/domain/tables/hooks";
import { useStore } from "@/stores";
import { errorMessage } from "@/lib/apiErrors";

export default function OrderPage() {
  const { tableId = "" } = useParams<{ tableId: string }>();
  const location = useLocation() as Location & { state?: { orderId?: string } };
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const store = useStore();

  const orderId = location.state?.orderId ?? search.get("order") ?? "";

  const { data: order, isLoading, refetch } = useOrder(orderId || undefined);
  const requestPayment = useRequestPayment();
  const setTableStatus = useSetTableStatus(tableId);
  const unlinkOrder = useUnlinkOrder(tableId);

  const [paying, setPaying] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<{ clientSecret: string } | null>(null);

  const isPaid = !!order?.paidAt;
  const isRejected = order?.status === "Rejected";

  async function handlePayNow() {
    if (!orderId) return;
    setPaying(true);
    try {
      await requestPayment.mutateAsync(orderId);
      const clientSecret = await pollForClientSecret(orderId, 12_000, 600);
      if (clientSecret) {
        setPaymentDialog({ clientSecret });
      } else {
        toast.error("Payment session not ready yet. Please try again.");
      }
    } catch (e: unknown) {
      toast.error(errorMessage(e) || "Could not start payment.");
    } finally {
      setPaying(false);
    }
  }

  async function handlePaymentSuccess() {
    setPaymentDialog(null);
    // Table-freeing logic - the guest has paid and is done, so this is the
    // right moment to release the table, not at fire-time.
    try { await unlinkOrder.mutateAsync(orderId); } catch (e) { console.warn("OrderPage: failed to unlink order from table", e); }
    try { await setTableStatus.mutateAsync({ status: "available" }); } catch (e) { console.warn("OrderPage: failed to mark table available", e); }
    store.clearTableSession(tableId);
    await refetch();
    toast.success("Payment confirmed!");
  }

  function handlePaymentFailure(message: string) {
    setPaymentDialog(null);
    toast.error(message);
    // Stay on this page - payment is retryable and decoupled from firing.
  }

  const amount = order?.grandTotal ?? null;

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <Card className="border-border">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">
            {orderId ? `Order ${orderId.slice(0, 8)}` : "Order"}
          </CardTitle>
          {order && (
            <Badge variant={isPaid ? "secondary" : isRejected ? "destructive" : "outline"}>
              {isPaid ? "Paid" : order.status}
            </Badge>
          )}
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-4">
          {isLoading || !orderId ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading order…
            </div>
          ) : !order ? (
            <div className="text-sm text-destructive">Order not found.</div>
          ) : (
            <>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{item.quantity}× {item.menuItemName}</span>
                    <span>${(item.quantity * item.unitPrice).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span>{amount != null ? `$${amount.toFixed(2)}` : "—"}</span>
              </div>

              {isPaid && (
                <div className="text-sm text-status-available flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Paid
                </div>
              )}
              {isRejected && (
                <div className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> This order was never fulfilled and cannot be paid.
                </div>
              )}
              {order.lastPaymentError && !isPaid && (
                <div className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> Last payment attempt failed: {order.lastPaymentError}
                </div>
              )}
              {order.receiptUrl && (
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a href={order.receiptUrl} target="_blank" rel="noreferrer">
                    <Receipt className="h-4 w-4 mr-2" /> View receipt
                  </a>
                </Button>
              )}

              <div className="flex gap-2 pt-2">
                {!isPaid && !isRejected && (
                  <Button onClick={handlePayNow} disabled={paying} className="flex-1">
                    {paying ? "Starting payment…" : "Pay Now"}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => navigate(`/pos/table/${tableId}/menu`)}>
                  Back to Menu
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {paymentDialog && (
        <StripeCheckoutDialog
          open
          orderId={orderId}
          clientSecret={paymentDialog.clientSecret}
          onOpenChange={(open) => { if (!open) setPaymentDialog(null); }}
          onSuccess={() => { void handlePaymentSuccess(); }}
          onFailure={handlePaymentFailure}
        />
      )}
    </div>
  );
}
