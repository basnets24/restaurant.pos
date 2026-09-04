import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveOrders, useCancelOrder, useMarkServed } from "@/domain/orders/hooks";
import { isPickupOrder } from "@/domain/orders/utils";
import { useTables } from "@/domain/tables/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { errorMessage } from "@/lib/apiErrors";
import { Utensils, Timer, CheckCircle2, XCircle, ClipboardList } from "lucide-react";

export default function ActiveOrdersPage() {
  const { data: active, isLoading } = useActiveOrders();
  const { data: tables } = useTables();
  const navigate = useNavigate();
  const cancelOrder = useCancelOrder();
  const markServed = useMarkServed();

  // Order carries tableId, not the human "Table 12" label - resolve it from
  // the floor list rather than duplicating table numbers onto every order.
  const tableNumberById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tables ?? []) map.set(t.id, t.number);
    return map;
  }, [tables]);

  const formatAge = (iso: string) => {
    // Elapsed-time display is intentionally live wall-clock time, recomputed each render.
    // eslint-disable-next-line react-hooks/purity
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const onVoid = async (orderId: string) => {
    try {
      await cancelOrder.mutateAsync(orderId);
      toast.success("Order voided");
    } catch (e: unknown) {
      toast.error(errorMessage(e) || "Could not void order.");
    }
  };

  const onServed = async (orderId: string) => {
    try {
      await markServed.mutateAsync(orderId);
    } catch (e: unknown) {
      toast.error(errorMessage(e) || "Could not mark order served.");
    }
  };

  return (
    <div className="p-4 mx-auto max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Active Orders</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{active.length} active</Badge>
          <Button variant="outline" size="sm" onClick={() => navigate("/pos/orders")}>
            <ClipboardList className="h-4 w-4 mr-1.5" /> All Orders
          </Button>
        </div>
      </div>

      {!isLoading && active.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No active kitchen tickets. Fire an order from a table.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {active.map((o) => {
            const pickup = isPickupOrder(o);
            const tableNumber = o.tableId ? tableNumberById.get(o.tableId) : undefined;
            return (
              <Card key={o.id} className="border-border">
                <CardHeader className="py-3 flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold font-numeric">
                      {pickup ? "P" : tableNumber || "?"}
                    </span>
                    {pickup ? "Pickup" : <>Table <span className="font-numeric">{tableNumber || o.tableId}</span></>}
                  </CardTitle>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Timer className="h-3.5 w-3.5" /> {formatAge(o.createdAt)}
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="p-4 space-y-3">
                  <div className="text-sm">
                    {o.items.map((i, ix) => (
                      <div key={ix} className="flex justify-between py-0.5">
                        <span className="truncate mr-2">{i.menuItemName}</span>
                        <span className="font-medium font-numeric">×{i.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (o.tableId) navigate(`/pos/table/${o.tableId}/menu`, { state: { cartId: o.id } });
                        else navigate(`/pos/orders/${o.id}`);
                      }}
                    >
                      {pickup ? "View" : "Resume"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={cancelOrder.isPending}
                      onClick={() => onVoid(o.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Void
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={markServed.isPending}
                      onClick={() => onServed(o.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Served
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
