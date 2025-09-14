import { Outlet, useParams } from "react-router-dom";
import { useAuth } from "@/api-authorization/AuthProvider";
import { useTenantInfo } from "@/app/TenantInfoProvider";
import { PosHeader } from "@/features/pos/components/PosHeader";
import { useKitchen } from "@/features/pos/kitchen/kitchenStore";

export default function PosLayout() {
  const { profile } = useAuth();
  const { restaurantName: nameFromTenant } = useTenantInfo();
  const restaurantName = nameFromTenant || (profile as any)?.restaurant_name || (profile as any)?.restaurantName || "Restaurant POS";
  const { tableId } = useParams();
  const kitchen = useKitchen();
  const activeOrdersCount = kitchen.active().length;

  const headerTo = {
    dashboard: "/home",
    tables: "/pos/tables",
    menu: (() => {
      if (tableId) return `/pos/table/${tableId}/menu`;
      const target = kitchen.defaultMenuTarget?.();
      if (target) return `/pos/table/${target.tableId}/menu?cartId=${encodeURIComponent(target.cartId)}`;
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
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
