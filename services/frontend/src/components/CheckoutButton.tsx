import { loadStripe } from "@stripe/stripe-js";
import Button from "./ui/Button";
import { createCheckoutSession } from "../features/payments/api";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function CheckoutButton({
                                           orderId,
                                           amount,
                                           currency = "usd",
                                           description,
                                           className = "",
                                       }: {
    orderId?: string;
    amount?: number;          // cents (e.g., 2599)
    currency?: string;        // "usd"
    description?: string;
    className?: string;
}) {
    const handleClick = async () => {
        try {
            // 1) ask your Payment Service for a Checkout Session
            const { sessionId } = await createCheckoutSession({ orderId, amount, currency, description });

            // 2) redirect using stripe-js (must be triggered by user gesture)
            const stripe = await stripePromise;
            if (!stripe) throw new Error("Stripe failed to load.");
            const { error } = await stripe.redirectToCheckout({ sessionId });

            // 3) handle edge-case errors (pop-up blockers, bad sessionId, etc.)
            if (error) alert(error.message);
        } catch (e: any) {
            alert(e?.message ?? "Unable to start checkout.");
        }
    };

    return (
        <Button onClick={handleClick} size="lg" className={className}>
            Start Checkout
        </Button>
    );
}
