import { Outlet, useParams } from "react-router-dom";
import { useAuth } from "@/api-authorization/AuthProvider";
import { useTable } from "@/domain/tables/hooks";
import { PosHeader } from "@/features/pos/components/PosHeader";

export default function PosLayout() {
  const { profile } = useAuth();
  const restaurantName =
    (profile as any)?.restaurant_name || (profile as any)?.restaurantName || "Restaurant POS";
  const { tableId } = useParams();
  const table = tableId ? useTable(tableId).data : undefined;

  const headerTo = {
    dashboard: "/home",
    tables: "/pos/tables",
    menu: tableId ? `/pos/table/${tableId}/menu` : "/pos/tables",
    orders: "/pos/orders",
    current: "/pos/current",
    checkout: "/pos/checkout",
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <PosHeader
        restaurantName={restaurantName}
        tableLabel={table ? `Table ${table.number}` : undefined}
        areaLabel={table?.section ?? undefined}
        to={headerTo}
        disabled={{ orders: true, current: true, checkout: true }}
      />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
