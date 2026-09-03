import { useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation, type Location } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Receipt, CheckCircle2, AlertTriangle, MoreVertical, Ban } from "lucide-react";

import { useOrder, useRequestPayment, useCancelOrder } from "@/domain/orders/hooks";
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
  const cancelOrder = useCancelOrder();
  const setTableStatus = useSetTableStatus(tableId);
  const unlinkOrder = useUnlinkOrder(tableId);

  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<{ clientSecret: string; attemptId: string } | null>(null);

  const isPaid = !!order?.paidAt;
  const isRejected = order?.status === "Rejected";
  const isCancellable = order?.status === "Pending";

  async function handlePayNow() {
    if (!orderId) return;
    setPaying(true);
    try {
      await requestPayment.mutateAsync(orderId);
      const session = await pollForClientSecret(orderId, 12_000, 600);
      if (session) {
        setPaymentDialog(session);
      } else {
        toast.error("Payment session not ready yet. Please try again.");
      }
    } catch (e: unknown) {
      toast.error(errorMessage(e) || "Could not start payment.");
    } finally {
      setPaying(false);
    }
  }

  async function handleCancelOrder() {
    if (!orderId) return;
    setCancelling(true);
    try {
      await cancelOrder.mutateAsync(orderId);
      await refetch();
      toast.success("Order voided.");
      setCancelDialogOpen(false);
    } catch (e: unknown) {
      toast.error(errorMessage(e) || "Could not void order.");
    } finally {
      setCancelling(false);
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
          <div className="flex items-center gap-1">
            {order && (
              <Badge variant={isPaid ? "secondary" : (isRejected || order.status === "Cancelled") ? "destructive" : "outline"}>
                {isPaid ? "Paid" : order.status === "Cancelled" ? "Voided" : order.status}
              </Badge>
            )}
            {isCancellable && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setCancelDialogOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Ban className="h-4 w-4 mr-2" /> Void Order
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
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
                <span>{amount != null ? `$${amount.toFixed(2)}` : "N/A"}</span>
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
              {order.status === "Cancelled" && (
                <div className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" /> This order was voided.
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
          attemptId={paymentDialog.attemptId}
          onOpenChange={(open) => { if (!open) setPaymentDialog(null); }}
          onSuccess={() => { void handlePaymentSuccess(); }}
          onFailure={handlePaymentFailure}
        />
      )}

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void this order?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This releases any reserved inventory back to stock and cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={cancelling}>
              Keep Order
            </Button>
            <Button variant="destructive" onClick={() => { void handleCancelOrder(); }} disabled={cancelling}>
              {cancelling ? "Voiding…" : "Void Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
