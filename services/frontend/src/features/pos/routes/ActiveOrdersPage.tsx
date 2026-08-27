import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useKitchen } from "@/features/pos/kitchen/kitchenStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Utensils, Timer, CheckCircle2, XCircle, ClipboardList } from "lucide-react";

export default function ActiveOrdersPage() {
  const kitchen = useKitchen();
  const navigate = useNavigate();

  const active = useMemo(() => {
    return kitchen.active().slice().sort((a, b) => a.firedAt - b.firedAt);
  }, [kitchen.tickets]);

  const formatAge = (ts: number) => {
    // Elapsed-time display is intentionally live wall-clock time, recomputed each render.
    // eslint-disable-next-line react-hooks/purity
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
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

      {active.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No active kitchen tickets. Fire an order from a table.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {active.map((t) => (
            <Card key={t.id} className="border-border">
              <CardHeader className="py-3 flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold font-numeric">
                    {t.tableNumber || "?"}
                  </span>
                  Table <span className="font-numeric">{t.tableNumber || t.tableId}</span>
                </CardTitle>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Timer className="h-3.5 w-3.5" /> {formatAge(t.firedAt)}
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-4 space-y-3">
                <div className="text-sm">
                  {t.items.map((i, ix) => (
                    <div key={ix} className="flex justify-between py-0.5">
                      <span className="truncate mr-2">{i.name}</span>
                      <span className="font-medium font-numeric">×{i.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      kitchen.setSelected(t.id);
                      navigate(`/pos/table/${t.tableId}/menu`, { state: { cartId: t.id } });
                    }}
                  >
                    Resume
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => kitchen.void(t.id)}>
                    <XCircle className="h-4 w-4 mr-1" /> Void
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => kitchen.serve(t.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Served
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
