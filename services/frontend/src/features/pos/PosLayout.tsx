import { Outlet, useParams } from "react-router-dom";
import { useTenantInfo } from "@/app/TenantInfoProvider";
import { PosHeader } from "@/features/pos/components/PosHeader";
import { useActiveOrders } from "@/domain/orders/hooks";
import { useFloorHub } from "@/domain/tables/realtime";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function PosLayout() {
  useDocumentTitle("Point of Sale · Spoontab");
  const { restaurantName: nameFromTenant } = useTenantInfo();
  const restaurantName = nameFromTenant || "Restaurant POS";
  const { tableId } = useParams();
  // Server-wide active orders, not just what this terminal happens to have
  // fired locally - see useIsFired for why the old local-only check was a bug.
  const activeOrders = useActiveOrders().data;
  const activeOrdersCount = activeOrders.length;

  // The connection itself is app-wide (FloorHubProvider, mounted once in
  // main.tsx for the whole login session) — this just subscribes to table
  // events on it for as long as PosLayout is mounted.
  useFloorHub();

  const headerTo = {
    dashboard: "/home",
    tables: "/pos/tables",
    menu: (() => {
      if (tableId) return `/pos/table/${tableId}/menu`;
      // Order.Id === cartId (see FinalOrderService.FinalizeOrderAsync).
      if (activeOrders.length === 1) {
        const only = activeOrders[0];
        if (only.tableId) return `/pos/table/${only.tableId}/menu?cartId=${encodeURIComponent(only.id)}`;
      }
      return "/pos/tables";
    })(),
    // Swap: current = active (local KDS), orders = server history (TBD)
    orders: "/pos/orders",
    current: "/pos/current",
    checkout: "/pos/checkout",
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <PosHeader
        restaurantName={restaurantName}
        tableLabel={undefined}
        areaLabel={undefined}
        to={headerTo}
        disabled={{ checkout: true }}
        counts={{ current: activeOrdersCount || undefined }}
      />
      <main className="flex flex-1 min-h-0 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
