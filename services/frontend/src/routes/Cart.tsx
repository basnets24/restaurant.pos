import CheckoutButton from "../components/CheckoutButton";

export default function Cart() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Cart</h1>
            <div className="rounded-2xl border p-6">
                <p className="mb-4 text-zinc-600">Your cart is ready to checkout.</p>
                <CheckoutButton />
            </div>
        </div>
    );
}
