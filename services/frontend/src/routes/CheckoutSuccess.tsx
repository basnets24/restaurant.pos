import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { confirmCheckout } from "../features/payments/api";

export default function CheckoutSuccess() {
    const [search] = useSearchParams();
    const sessionId = search.get("session_id") ?? undefined;

    const { data, status, error } = useQuery({
        queryKey: ["confirm-checkout", sessionId],
        queryFn: () => confirmCheckout(sessionId!),
        enabled: !!sessionId, // only run if session_id exists
    });

    return (
        <div className="mx-auto max-w-xl">
            <div className="theme-card p-8">
                <h1 className="mb-2 text-2xl font-semibold">Payment success 🎉</h1>

                {!sessionId && (
                    <p className="text-zinc-600">Missing <code>session_id</code> in the URL.</p>
                )}

                {sessionId && status === "pending" && (
                    <p className="text-zinc-600">Confirming your payment…</p>
                )}

                {status === "success" && (
                    <div className="space-y-3">
                        <p className="text-zinc-700">
                            Payment confirmed. Thank you!
                            {data?.amount ? ` Charged ${data.amount} ${data.currency ?? ""}.` : ""}
                        </p>
                        {data?.receiptUrl && (
                            <a href={data.receiptUrl} target="_blank" className="text-blue-600 underline">
                                View receipt
                            </a>
                        )}
                        <div className="flex gap-3 pt-2">
                            <Link to="/" className="rounded-xl px-4 py-2 ring-1 ring-zinc-300 hover:bg-zinc-50">
                                Back to menu
                            </Link>
                            <Link to="/orders" className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90">
                                View order
                            </Link>
                        </div>
                    </div>
                )}

                {status === "error" && (
                    <div role="alert" className="mt-2 rounded-lg bg-red-50 p-3 text-red-700">
                        {(error as Error)?.message ?? "Could not confirm payment."}
                    </div>
                )}
            </div>
        </div>
    );
}
