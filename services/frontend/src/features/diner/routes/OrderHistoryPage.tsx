import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Receipt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DinerOrderKeys,
  DinerOrders,
  dinerErrorMessage,
  type DinerOrderSummary,
} from "@/domain/dinerOrders";

import { DinerHeader } from "../components/DinerHeader";
import { DinerNotificationBell } from "../components/DinerNotificationBell";
import { DinerAccountMenu } from "../components/DinerAccountMenu";
import { useDinerAuth } from "../auth/DinerAuthProvider";
import { rememberDinerTenant } from "../cart/lastTenant";
import { money } from "../money";

/** Orders still moving. Anything else has settled and will not change on its own. */
const LIVE = ["Pending"];

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const { isSignedIn, getToken } = useDinerAuth();

  const history = useQuery<DinerOrderSummary[]>({
    queryKey: DinerOrderKeys.history(),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Signed out");
      return DinerOrders.history(token);
    },
    enabled: isSignedIn,
    // Someone watching this page while an order is being fired or paid should see it land.
    refetchInterval: (query) =>
      query.state.data?.some((o) => LIVE.includes(o.status)) ? 5000 : false,
  });

  /**
   * Every read of a single order is tenant-scoped, and the remembered tenant is whichever
   * restaurant the diner last ordered from - which on this page is very often not the row they
   * just tapped. Setting it here is what keeps the status page from 404ing on an order the
   * diner can plainly see in front of them.
   */
  const open = (order: DinerOrderSummary) => {
    rememberDinerTenant({ restaurantId: order.restaurantId, locationId: order.locationId });
    navigate(`/order/orders/${order.orderId}`);
  };

  return (
    <>
      <DinerHeader
        left={
          <Button variant="ghost" className="gap-1.5 -ml-2" onClick={() => navigate("/order")}>
            <ArrowLeft className="h-4 w-4" />
            Restaurants
          </Button>
        }
        right={
          <>
            <DinerNotificationBell />
            <DinerAccountMenu />
          </>
        }
      />

      <main className="mx-auto max-w-[720px] px-4 sm:px-8 py-6">
        <h1 className="text-2xl font-semibold">Your orders</h1>

        {!isSignedIn ? (
          <Empty>Sign in when you place an order and it will show up here.</Empty>
        ) : history.isPending ? (
          <div className="mt-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[86px] rounded-lg bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : history.isError ? (
          <Empty>{dinerErrorMessage(history.error, "We couldn't load your orders.")}</Empty>
        ) : history.data.length === 0 ? (
          <Empty>
            <Receipt className="mx-auto mb-3 h-6 w-6" />
            Nothing here yet. Your orders from every restaurant will collect on this page.
          </Empty>
        ) : (
          <ul className="mt-6 space-y-3">
            {history.data.map((order) => (
              <li key={order.orderId}>
                <button
                  type="button"
                  onClick={() => open(order)}
                  className="w-full rounded-lg border border-border px-4 py-3 text-left transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {/* Null only when the name couldn't be resolved when the order was
                            placed; the location id is at least something the diner could
                            match against a receipt. */}
                        {order.restaurantName ?? order.restaurantId}
                      </p>
                      <p className="text-[13px] text-muted-foreground truncate">
                        {[order.locationName, when(order.createdAt)].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1 text-[13px] text-muted-foreground truncate">
                        {order.itemSummary}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-numeric text-sm">{money(order.grandTotal)}</span>
                      <div className="mt-1.5">
                        <Badge variant={tone(order.status)}>{order.status}</Badge>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-16 text-center text-muted-foreground">{children}</p>;
}

/** Cancelled and Rejected both mean "you were not charged", so they read the same. */
function tone(status: string): "default" | "secondary" | "destructive" {
  if (status === "Paid") return "default";
  if (status === "Cancelled" || status === "Rejected") return "destructive";
  return "secondary";
}

const FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const when = (iso: string) => FORMAT.format(new Date(iso));
