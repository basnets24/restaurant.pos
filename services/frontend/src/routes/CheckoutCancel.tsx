import { Link } from "react-router-dom";

export default function CheckoutCancel() {
    return (
        <div className="mx-auto max-w-xl">
            <div className="theme-card p-8">
                <h1 className="mb-2 text-2xl font-semibold">Payment canceled</h1>
                <p className="text-zinc-700">
                    Your payment was canceled before completion. You can resume checkout anytime.
                </p>
                <div className="mt-6 flex gap-3">
                    <Link to="/" className="rounded-xl px-4 py-2 ring-1 ring-zinc-300 hover:bg-zinc-50">
                        Back to menu
                    </Link>
                    <Link to="/cart" className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90">
                        Return to cart
                    </Link>
                </div>
            </div>
        </div>
    );
}
