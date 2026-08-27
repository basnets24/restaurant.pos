import { useState, type FormEvent } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { confirmPayment, type PaymentConfirmResponse } from "@/domain/payments/api";
import { ENV } from "@/config/env";
import { errorMessage } from "@/lib/apiErrors";

// loadStripe should only ever be called once per publishable key
const stripePromise = loadStripe(ENV.STRIPE_PUBLISHABLE_KEY);

/**
 * How the server-side verification is performed. Defaults to the staff call, which mints a
 * scoped token from the POS session; the diner app passes its own because a diner token comes
 * from a different provider entirely and carries explicit tenant headers.
 */
type ConfirmFn = (orderId: string) => Promise<PaymentConfirmResponse>;

type StripeCheckoutDialogProps = {
  open: boolean;
  orderId: string;
  clientSecret: string;
  onSuccess: () => void;
  onFailure: (message: string) => void;
  onOpenChange: (open: boolean) => void;
  confirm?: ConfirmFn;
};

export function StripeCheckoutDialog({
  open,
  orderId,
  clientSecret,
  onSuccess,
  onFailure,
  onOpenChange,
  confirm,
}: StripeCheckoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
        </DialogHeader>
        <StripeElementsForm
          orderId={orderId}
          clientSecret={clientSecret}
          onSuccess={onSuccess}
          onFailure={onFailure}
          confirm={confirm}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * The Stripe Elements + embedded PaymentElement form, without a surrounding
 * Dialog — so it can be dropped into any dialog (e.g. the cart's inline
 * checkout dialog) as well as StripeCheckoutDialog above.
 */
export function StripeElementsForm({
  orderId,
  clientSecret,
  onSuccess,
  onFailure,
  confirm,
}: {
  orderId: string;
  clientSecret: string;
  onSuccess: () => void;
  onFailure: (message: string) => void;
  confirm?: ConfirmFn;
}) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentForm
        orderId={orderId}
        onSuccess={onSuccess}
        onFailure={onFailure}
        confirm={confirm}
      />
    </Elements>
  );
}

function PaymentForm({
  orderId,
  onSuccess,
  onFailure,
  confirm = confirmPayment,
}: {
  orderId: string;
  onSuccess: () => void;
  onFailure: (message: string) => void;
  confirm?: ConfirmFn;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    try {
      // redirect: 'if_required' keeps card payments inline; only truly
      // redirect-based payment methods would leave the page.
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message ?? "Payment failed");
        return;
      }

      // Ask our backend to verify with Stripe server-side and publish the
      // saga event - never trust the client-side result alone.
      const result = await confirm(orderId);
      if (result.status === "succeeded") {
        onSuccess();
      } else if (result.status === "failed") {
        onFailure(result.error ?? "Payment failed");
      } else {
        setError("Payment is still processing - please try again in a moment.");
      }
    } catch (err: unknown) {
      setError(errorMessage(err) ?? "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error ? <div className="text-sm text-destructive">{error}</div> : null}
      <DialogFooter>
        <Button type="submit" disabled={!stripe || submitting} className="w-full">
          {submitting ? "Processing…" : "Pay now"}
        </Button>
      </DialogFooter>
    </form>
  );
}
