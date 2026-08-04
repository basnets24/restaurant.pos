import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DinerOrderKeys,
  DinerOrders,
  dinerErrorMessage,
  type DinerEstimate,
  type DinerTenant,
} from "@/domain/dinerOrders";

import { DinerHeader } from "../components/DinerHeader";
import { DinerAuthDialog } from "../auth/DinerAuthDialog";
import { useDinerAuth } from "../auth/DinerAuthProvider";
import { useDinerCart } from "../cart/DinerCartProvider";
import { rememberDinerTenant } from "../cart/lastTenant";
import { toCheckoutRequest } from "../cart/dinerCartTypes";
import { money } from "../money";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, clear } = useDinerCart();
  const { isSignedIn, session, getToken } = useDinerAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const tenant: DinerTenant | null = cart
    ? { restaurantId: cart.restaurantId, locationId: cart.locationId }
    : null;

  const request = useMemo(() => (cart ? toCheckoutRequest(cart) : null), [cart]);

  // Set the instant a checkout succeeds, before the cart is cleared. Without it the
  // empty-cart guard below sees the freshly-emptied cart and races the success navigation to
  // send the diner to the restaurant list instead of their confirmation - order placed, no
  // confirmation shown, which reads as a failure.
  const placed = useRef(false);

  useEffect(() => {
    if (placed.current) return;
    // Nothing to check out - a stale link, or a refresh long after the order went through.
    if (!cart || cart.lines.length === 0) navigate("/order", { replace: true });
  }, [cart, navigate]);

  const quote = useQuery<DinerEstimate>({
    queryKey: request && tenant ? DinerOrderKeys.quote(tenant, request) : ["dinerQuote", "idle"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Signed out");
      return DinerOrders.quote(token, tenant!, request!);
    },
    // The quote endpoint needs the diner scope, so there is nothing to show until they sign in.
    enabled: Boolean(isSignedIn && request && tenant),
    retry: false,
  });

  const place = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Please sign in again.");
      return DinerOrders.checkout(token, tenant!, request!);
    },
    onSuccess: (result) => {
      placed.current = true;
      // Remember the tenant before clearing the cart - the confirmation page still needs it
      // for its tenant headers, and a diner token carries no tenant claims to fall back on.
      rememberDinerTenant(tenant!);
      // Clear only after the server confirms. Clearing optimistically would destroy the cart
      // on a failure the diner could otherwise just retry.
      clear();
      toast.success("Order sent to the kitchen");
      navigate(`/order/orders/${result.orderId}`, { replace: true });
    },
    onError: (error) => {
      toast.error(dinerErrorMessage(error, "Could not place your order. Please try again."));
    },
  });

  if (!cart || cart.lines.length === 0) return null;

  const itemsTotal = cart.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  return (
    <>
      <DinerHeader
        left={
          <Button
            variant="ghost"
            className="gap-1.5 -ml-2"
            onClick={() => navigate(`/order/${cart.restaurantId}/${cart.locationId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Menu
          </Button>
        }
      />

      <main className="mx-auto max-w-[640px] px-4 sm:px-8 py-6">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Pickup from {cart.restaurantName}
        </p>

        <section className="mt-6 rounded-lg border border-border">
          <h2 className="px-4 py-3 text-[15px] font-semibold border-b border-border">
            Your order
          </h2>
          <div className="px-4 py-1">
            {cart.lines.map((line) => (
              <div key={line.key} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    <span className="font-numeric">{line.quantity}×</span> {line.name}
                  </p>
                  {line.optionsLabel && (
                    <p className="text-[13px] text-muted-foreground">{line.optionsLabel}</p>
                  )}
                </div>
                <span className="font-numeric text-sm shrink-0">
                  {money(line.unitPrice * line.quantity)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-border px-4 py-3">
          {!isSignedIn ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-[13px] text-muted-foreground">
                Sign in to see your total and place this order.
              </p>
              <span className="font-numeric text-sm">{money(itemsTotal)}</span>
            </div>
          ) : quote.isPending ? (
            <div className="h-20 rounded bg-muted/40 animate-pulse" />
          ) : quote.isError ? (
            <p className="text-[13px] text-destructive">
              {dinerErrorMessage(quote.error, "Couldn't price your order.")}
            </p>
          ) : (
            // Every figure below comes from the server's estimate - the client never
            // computes tax, discounts or fees.
            <dl className="flex flex-col gap-1.5 text-sm">
              <Row label="Subtotal" value={quote.data.subtotal} />
              {quote.data.appliedDiscounts.map((d) => (
                <Row key={d.id} label={d.name} value={-(d.amount ?? 0)} muted />
              ))}
              {quote.data.serviceCharges.map((c) => (
                <Row key={c.id} label={c.name} value={c.amount ?? 0} muted />
              ))}
              {quote.data.appliedTaxes.map((t) => (
                <Row key={t.id} label={t.name} value={t.amount ?? 0} muted />
              ))}
              <div className="mt-1 pt-2 border-t border-border">
                <Row label="Total" value={quote.data.grandTotal} emphasis />
              </div>
            </dl>
          )}
        </section>

        <div className="mt-5">
          {isSignedIn ? (
            <Button
              className="w-full gap-2"
              disabled={place.isPending || quote.isPending || quote.isError}
              onClick={() => place.mutate()}
            >
              <ShoppingBag className="h-4 w-4" />
              {place.isPending ? "Placing your order…" : "Place order"}
            </Button>
          ) : (
            <Button className="w-full" onClick={() => setAuthOpen(true)}>
              Sign in to continue
            </Button>
          )}
          <p className="mt-2 text-center text-[12px] text-muted-foreground">
            {isSignedIn
              ? `Ordering as ${session?.email}. You'll pay on the next step.`
              : "You'll pay after the restaurant confirms your order."}
          </p>
        </div>
      </main>

      <DinerAuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}

function Row({
  label,
  value,
  muted,
  emphasis,
}: {
  label: string;
  value: number;
  muted?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between ${
        emphasis ? "font-semibold text-[15px]" : muted ? "text-muted-foreground text-[13px]" : ""
      }`}
    >
      <dt>{label}</dt>
      <dd className="font-numeric">{money(value)}</dd>
    </div>
  );
}
