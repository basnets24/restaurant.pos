import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StripeCheckoutDialog } from "@/features/pos/components/StripeCheckoutDialog";
import {
  DinerOrderKeys,
  DinerOrders,
  dinerErrorMessage,
  type DinerOrder,
  type DinerPaymentSession,
  type DinerTenant,
} from "@/domain/dinerOrders";

import { DinerHeader } from "../components/DinerHeader";
import { useDinerAuth } from "../auth/DinerAuthProvider";
import { useDinerLastTenant } from "../cart/lastTenant";
import { money } from "../money";

/** Statuses past which nothing more will happen to the order, so polling can stop. */
const SETTLED = ["Paid", "Cancelled", "Rejected"];

export default function OrderStatusPage() {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const { isSignedIn, getToken } = useDinerAuth();
  const tenant = useDinerLastTenant();
  const queryClient = useQueryClient();

  const [payOpen, setPayOpen] = useState(false);
  // Set the instant Stripe confirms, before the order's own status has caught up (that write
  // happens in a different service, off the PaymentSucceeded event, a broker round trip later -
  // see onPaid below). Showing a transitional state here instead of the pre-payment UI avoids a
  // few seconds where the screen looks like it forgot you just paid.
  const [confirming, setConfirming] = useState(false);

  const order = useQuery<DinerOrder>({
    queryKey: DinerOrderKeys.detail(orderId),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Signed out");
      return DinerOrders.get(token, tenant as DinerTenant, orderId);
    },
    enabled: Boolean(isSignedIn && orderId && tenant),
    // An order sits at Pending from checkout until it is paid - inventory reservation moves the
    // saga, not the order - so the status alone never announces that payment is ready. Polling
    // until the order settles covers that wait and the one after Stripe (PaymentSucceeded
    // reaches the order through a consumer, a broker round trip later) with one mechanism.
    refetchInterval: (query) =>
      query.state.data && !SETTLED.includes(query.state.data.status) ? 5000 : false,
  });

  const paid = Boolean(order.data?.paidAt) || order.data?.status === "Paid";
  const dead = order.data?.status === "Cancelled" || order.data?.status === "Rejected";

  const session = useQuery<DinerPaymentSession>({
    queryKey: DinerOrderKeys.paymentSession(orderId),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Signed out");
      return DinerOrders.paymentSession(token, tenant as DinerTenant, orderId);
    },
    enabled: Boolean(isSignedIn && orderId && tenant && order.data && !paid && !dead),
    // The PaymentIntent is created off InventoryReserved, so it simply is not there for the
    // first few seconds. Poll until the secret shows up, then stop - it does not change.
    refetchInterval: (query) => (query.state.data?.clientSecret ? false : 5000),
  });

  const clientSecret = session.data?.clientSecret ?? null;

  const cancel = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      return DinerOrders.cancel(token, tenant as DinerTenant, orderId);
    },
    onSuccess: async () => {
      toast.success("Order cancelled");
      await queryClient.invalidateQueries({ queryKey: DinerOrderKeys.detail(orderId) });
    },
    onError: (error) => {
      // The likely failure is a 409 for an order that got paid in another tab, and the server's
      // own wording says so more usefully than anything generic would.
      toast.error(dinerErrorMessage(error, "Could not cancel your order."));
    },
  });

  const onPaid = async () => {
    setPayOpen(false);
    setConfirming(true);
    // PaymentSucceeded reaches the order entity through a consumer, not synchronously, so the
    // refetch below may still read Confirmed. The poll above keeps running until it says Paid,
    // at which point `paid` flips and the confirming state below stops rendering on its own.
    await queryClient.invalidateQueries({ queryKey: DinerOrderKeys.detail(orderId) });
  };

  const showConfirming = confirming && !paid && !dead;

  return (
    <>
      <DinerHeader
        left={
          <Button variant="ghost" className="gap-1.5 -ml-2" onClick={() => navigate("/order")}>
            <ArrowLeft className="h-4 w-4" />
            Restaurants
          </Button>
        }
      />

      <main className="mx-auto max-w-[640px] px-4 sm:px-8 py-6">
        {order.isPending ? (
          <div className="h-40 rounded-lg bg-muted/40 animate-pulse" />
        ) : order.isError ? (
          <p className="py-16 text-center text-muted-foreground">
            {dinerErrorMessage(order.error, "We couldn't find that order.")}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {dead ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : paid ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : showConfirming ? (
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
              ) : (
                <Clock className="h-5 w-5 text-muted-foreground" />
              )}
              <h1 className="text-2xl font-semibold">
                {/* Keyed on the payment session rather than the status, which stays Pending the
                    whole way from checkout to paid and so can't tell these two apart. showConfirming
                    takes priority over both so the screen doesn't flash back to "Ready to pay"
                    while the order's own status is still catching up to the payment. */}
                {dead
                  ? "Order cancelled"
                  : paid
                    ? "Paid, see you soon"
                    : showConfirming
                      ? "Confirming your payment…"
                      : clientSecret
                        ? "Ready to pay"
                        : "Sending to the kitchen…"}
              </h1>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              <Badge variant="secondary">{order.data.status}</Badge>
              <span className="font-numeric">#{order.data.id.slice(0, 8)}</span>
            </div>

            <section className="mt-6 rounded-lg border border-border">
              <div className="px-4 py-1">
                {order.data.items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        <span className="font-numeric">{item.quantity}×</span> {item.menuItemName}
                      </p>
                      {item.selectedModifiers.length > 0 && (
                        <p className="text-[13px] text-muted-foreground">
                          {item.selectedModifiers.map((m) => m.optionName).join(" · ")}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[13px] text-muted-foreground">Note: {item.notes}</p>
                      )}
                    </div>
                    <span className="font-numeric text-sm shrink-0">
                      {money(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border px-4 py-3 flex items-center justify-between text-[15px] font-semibold">
                <span>Total</span>
                <span className="font-numeric">{money(order.data.grandTotal)}</span>
              </div>
            </section>

            <div className="mt-5">
              {paid ? (
                <p className="text-center text-[13px] text-muted-foreground">
                  We'll have it ready for you at the counter.
                </p>
              ) : dead ? (
                <p className="text-center text-[13px] text-muted-foreground">
                  This order wasn't fulfilled, and you haven't been charged.
                </p>
              ) : showConfirming ? (
                <Button className="w-full" size="lg" disabled>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming your payment…
                </Button>
              ) : clientSecret ? (
                <Button className="w-full" size="lg" onClick={() => setPayOpen(true)}>
                  Pay {money(order.data.grandTotal)}
                </Button>
              ) : (
                // Deliberately a disabled button rather than a spinner: the diner needs to see
                // that paying is the next step and is coming, not wonder whether it's their move.
                <Button className="w-full" size="lg" disabled>
                  Preparing payment…
                </Button>
              )}

              {/* Offered right up until the order is paid - and hidden once payment is confirmed
                  even though the order's own status hasn't caught up yet, so a diner can't cancel
                  an order they already paid for during that gap. */}
              {!paid && !dead && !showConfirming && (
                <Button
                  variant="ghost"
                  className="mt-2 w-full text-muted-foreground"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate()}
                >
                  {cancel.isPending ? "Cancelling…" : "Cancel order"}
                </Button>
              )}
            </div>
          </>
        )}
      </main>

      {clientSecret && (
        <StripeCheckoutDialog
          open={payOpen}
          onOpenChange={setPayOpen}
          orderId={orderId}
          clientSecret={clientSecret}
          onSuccess={onPaid}
          onFailure={(message) => toast.error(message)}
          // The diner's own token and tenant. The default confirm mints a staff token from the
          // POS session, which a diner does not have.
          confirm={async (id) => {
            const token = await getToken();
            if (!token) throw new Error("Please sign in again to finish paying.");
            return DinerOrders.confirmPayment(token, tenant as DinerTenant, id);
          }}
        />
      )}
    </>
  );
}
