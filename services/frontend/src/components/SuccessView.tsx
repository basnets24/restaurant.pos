// SuccessView.tsx
import { useEffect } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
// import { PaymentsApi } from "@/domain/payments/api"; // if you verify server-side

export default function SuccessView() {
  const { tableId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const orderId = params.get("order");
  const sessionId = params.get("session_id");

  useEffect(() => {
    // Optional: verify with backend then route to the order page
    // PaymentsApi.verifyCheckout({ orderId, sessionId }).finally(() => { ... })
    if (orderId && sessionId) {
      toast.success("Payment confirmed! 🎉");

      // Route customers to the order summary for this table
      navigate(`/table/${tableId}/order`, { replace: true, state: { orderId } });
    }
  }, [orderId, sessionId, tableId, navigate]);

  

  return (
    <div className="flex h-[70vh] items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold mb-2">Processing your success…</h1>
        <p className="opacity-80">Order <span className="font-mono">{orderId}</span></p>
        <div className="mt-6">
          <Link
            to={`/table/${tableId}/order`}
            className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700"
          >
            Go to Order
          </Link>
        </div>
      </div>
    </div>
  );
}
