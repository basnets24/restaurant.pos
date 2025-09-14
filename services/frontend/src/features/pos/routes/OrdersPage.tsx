import { useMemo } from "react";
import { useAuth } from "@/api-authorization/AuthProvider";
import { useOrders } from "@/domain/orders/hooks";
import type { TenantHeaders } from "@/domain/orders/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Receipt, Timer, CheckCircle2 } from "lucide-react";

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export default function OrdersPage() {
  const { profile } = useAuth();
  const tenant: TenantHeaders | undefined = useMemo(() => {
    const restaurantId = (profile as any)?.restaurantId ?? (profile as any)?.restaurant_id;
    const locationId = (profile as any)?.locationId ?? (profile as any)?.location_id;
    if (!restaurantId && !locationId) return undefined;
    return { restaurantId, locationId };
  }, [profile]);

  const { data, isLoading } = useOrders(tenant);

  const orders = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray((data as any).items)) return (data as any).items;
    return [] as any[];
  }, [data]);

  return (
    <div className="p-4 mx-auto max-w-6xl space-y-4">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Orders</h1>
        <p className="text-sm text-muted-foreground">Checked-out orders from the server</p>
      </header>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading orders…</div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No orders found.</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((o: any) => (
            <Card key={o.id} className="border-border">
              <CardHeader className="py-3 flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
                    {(o.tableNumber ?? o.tableId ?? "").toString().slice(-2) || "#"}
                  </span>
                  <span className="truncate">Order {o.id.slice(0, 8)}</span>
                </CardTitle>
                <Badge variant={o.paidAt ? "secondary" : "outline"} className="text-xs">
                  {o.status || (o.paidAt ? "Paid" : "Pending")}
                </Badge>
              </CardHeader>
              <Separator />
              <CardContent className="p-4 space-y-3">
                <div className="text-sm flex items-center gap-2 text-muted-foreground">
                  <Timer className="h-4 w-4" /> {formatDate(o.createdAt)}
                </div>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>Items</span>
                    <span className="font-medium">{o.items?.length ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total</span>
                    <span className="font-semibold">${Number(o.grandTotal ?? 0).toFixed(2)}</span>
                  </div>
                </div>
                {o.paidAt && (
                  <div className="text-xs text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Paid {formatDate(o.paidAt)}
                  </div>
                )}
                {o.receiptUrl && (
                  <div className="pt-2">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <a href={o.receiptUrl} target="_blank" rel="noreferrer">
                        <Receipt className="h-4 w-4 mr-2" /> View receipt
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

