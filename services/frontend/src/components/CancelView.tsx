// CancelView.tsx
import { useParams, useSearchParams, Link } from "react-router-dom";

export default function CancelView() {
  const { tableId } = useParams();
  const [params] = useSearchParams();
  const orderId = params.get("order");

  return (
    <div className="flex h-[70vh] items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-destructive">Payment canceled</h1>
        <p className="opacity-80">
          Checkout for order <span className="font-mono">{orderId}</span> was canceled.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link
            to={`/pos/table/${tableId}/menu`}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-brand-strong"
          >
            Try Checkout Again
          </Link>
          <Link
            to={`/pos/table/${tableId}/menu`}
            className="px-4 py-2 rounded-xl border border-border hover:bg-accent hover:text-accent-foreground"
          >
            Back to Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
