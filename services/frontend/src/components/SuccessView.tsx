// SuccessView.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { getOrder } from "@/domain/orders/api";
import type { OrderDto } from "@/domain/orders/types";

export default function SuccessView() {
  const { tableId = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const orderId = useMemo(() => params.get("order") ?? "", [params]);
  const sessionId = useMemo(() => params.get("session_id") ?? "", [params]);

  const [loading, setLoading] = useState<boolean>(true);
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!orderId) {
        setError("Missing order id");
        setLoading(false);
        return;
      }
      try {
        const data = await getOrder(orderId);
        if (!mounted) return;
        setOrder(data);
        setLoading(false);
        toast.success("Payment confirmed! 🎉");
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Could not load order");
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [orderId]);

  const amount = useMemo(() => order?.grandTotal ?? null, [order]);
  const receiptUrl = useMemo(() => order?.receiptUrl ?? null, [order]);

  return (
    <div className="max-w-xl mx-auto p-6">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Payment Successful
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading order details…
            </div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                Order <span className="font-mono">{order?.id}</span>
                {sessionId ? (
                  <>
                    {" "}• Session <span className="font-mono">{sessionId}</span>
                  </>
                ) : null}
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm">Amount</span>
                <span className="font-medium">{amount != null ? `$${amount.toFixed(2)}` : "—"}</span>
              </div>
              <div className="flex gap-2 pt-2">
                {receiptUrl ? (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" /> View Receipt
                  </a>
                ) : null}
                <Button
                  onClick={() => navigate(`/pos/table/${tableId}/order`, { state: { orderId: order?.id } })}
                  variant={receiptUrl ? "outline" : "default"}
                >
                  Go to Order
                </Button>
                <Button variant="ghost" onClick={() => navigate(`/pos/table/${tableId}/menu`)}>
                  Back to Menu
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
