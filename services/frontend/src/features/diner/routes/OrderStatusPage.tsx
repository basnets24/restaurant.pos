import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DinerOrderKeys,
  DinerOrders,
  dinerErrorMessage,
  type DinerOrder,
  type DinerTenant,
} from "@/domain/dinerOrders";

import { DinerHeader } from "../components/DinerHeader";
import { useDinerAuth } from "../auth/DinerAuthProvider";
import { useDinerLastTenant } from "../cart/lastTenant";
import { money } from "../money";

export default function OrderStatusPage() {
  const { orderId = "" } = useParams();
  const navigate = useNavigate();
  const { isSignedIn, getToken } = useDinerAuth();
  const tenant = useDinerLastTenant();

  const order = useQuery<DinerOrder>({
    queryKey: DinerOrderKeys.detail(orderId),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Signed out");
      return DinerOrders.get(token, tenant as DinerTenant, orderId);
    },
    enabled: Boolean(isSignedIn && orderId && tenant),
    // The order is Pending until the saga reserves inventory, which takes a broker round trip.
    // Poll until it settles rather than leaving the diner on a stale "Pending".
    refetchInterval: (query) =>
      query.state.data && query.state.data.status === "Pending" ? 2000 : false,
  });

  return (
    <>
      <DinerHeader
        left={
          <Button variant="ghost" className="gap-1.5 -ml-2" onClick={() => navigate("/order")}>
            <ArrowLeft className="h-4 w-4" />
            Restaurants
          </Button>
        }
      />

      <main className="mx-auto max-w-[640px] px-4 sm:px-8 py-6">
        {order.isPending ? (
          <div className="h-40 rounded-lg bg-muted/40 animate-pulse" />
        ) : order.isError ? (
          <p className="py-16 text-center text-muted-foreground">
            {dinerErrorMessage(order.error, "We couldn't find that order.")}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {order.data.status === "Pending" ? (
                <Clock className="h-5 w-5 text-muted-foreground" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
              <h1 className="text-2xl font-semibold">
                {order.data.status === "Pending" ? "Sending to the kitchen…" : "Order confirmed"}
              </h1>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
              <Badge variant="secondary">{order.data.status}</Badge>
              <span className="font-numeric">#{order.data.id.slice(0, 8)}</span>
            </div>

            <section className="mt-6 rounded-lg border border-border">
              <div className="px-4 py-1">
                {order.data.items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        <span className="font-numeric">{item.quantity}×</span> {item.menuItemName}
                      </p>
                      {item.selectedModifiers.length > 0 && (
                        <p className="text-[13px] text-muted-foreground">
                          {item.selectedModifiers.map((m) => m.optionName).join(" · ")}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[13px] text-muted-foreground">Note: {item.notes}</p>
                      )}
                    </div>
                    <span className="font-numeric text-sm shrink-0">
                      {money(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border px-4 py-3 flex items-center justify-between text-[15px] font-semibold">
                <span>Total</span>
                <span className="font-numeric">{money(order.data.grandTotal)}</span>
              </div>
            </section>

            {/* Payment lands in the next phase - the PaymentIntent already exists by now,
                created automatically once inventory was reserved. */}
            <p className="mt-5 text-center text-[13px] text-muted-foreground">
              {order.data.paidAt ? "Paid — see you soon." : "Payment is coming in the next release."}
            </p>
          </>
        )}
      </main>
    </>
  );
}
