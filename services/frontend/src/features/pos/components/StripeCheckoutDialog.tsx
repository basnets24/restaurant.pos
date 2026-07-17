import { useState, type FormEvent } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { confirmPayment } from "@/domain/payments/api";
import { ENV } from "@/config/env";

// loadStripe should only ever be called once per publishable key
const stripePromise = loadStripe(ENV.STRIPE_PUBLISHABLE_KEY);

type StripeCheckoutDialogProps = {
  open: boolean;
  orderId: string;
  clientSecret: string;
  onSuccess: () => void;
  onFailure: (message: string) => void;
  onOpenChange: (open: boolean) => void;
};

export function StripeCheckoutDialog({
  open,
  orderId,
  clientSecret,
  onSuccess,
  onFailure,
  onOpenChange,
}: StripeCheckoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
        </DialogHeader>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm orderId={orderId} onSuccess={onSuccess} onFailure={onFailure} />
        </Elements>
      </DialogContent>
    </Dialog>
  );
}

function PaymentForm({
  orderId,
  onSuccess,
  onFailure,
}: {
  orderId: string;
  onSuccess: () => void;
  onFailure: (message: string) => void;
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
      const result = await confirmPayment(orderId);
      if (result.status === "succeeded") {
        onSuccess();
      } else if (result.status === "failed") {
        onFailure(result.error ?? "Payment failed");
      } else {
        setError("Payment is still processing - please try again in a moment.");
      }
    } catch (err: any) {
      setError(err?.message ?? "Payment failed");
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
