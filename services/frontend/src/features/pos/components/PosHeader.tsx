import { useMemo } from "react";
import { AppHeader, type AppHeaderNavItem } from "@/components/AppHeader";
import {
  LayoutDashboard,
  Table2,
  UtensilsCrossed,
  ReceiptText,
} from "lucide-react";

type NavKey = "dashboard" | "tables" | "menu" | "orders" | "current" | "checkout";

export interface PosHeaderProps {
  restaurantName: string;
  /** Example: "Table 2" */
  tableLabel?: string;
  /** Example: "Main Dining" */
  areaLabel?: string;
  guests?: number;
  /** Base routes for the nav actions (defaults shown) */
  to?: {
    dashboard?: string;
    tables?: string;
    menu?: string;
    orders?: string;
    current?: string;
    checkout?: string;
  };
  /** Disable actions that don't make sense yet (e.g., no cart) */
  disabled?: Partial<Record<NavKey, boolean>>;
  /** Optional badge counts (e.g., current order items) */
  counts?: Partial<Record<NavKey, number>>;
  /** Optional right-side extra (shift selector, location, etc.) */
  rightExtra?: React.ReactNode;
}

export function PosHeader({
  restaurantName,
  tableLabel,
  areaLabel,
  guests,
  to,
  disabled,
  counts,
  rightExtra,
}: PosHeaderProps) {
  const routes = useMemo(
    () => ({
      dashboard: to?.dashboard ?? "/home",
      tables: to?.tables ?? "/pos/tables",
      menu: to?.menu ?? (tableLabel ? "/pos/table/unknown/menu" : "/pos/menu"),
      orders: to?.orders ?? "/pos/orders",
      current: to?.current ?? "/pos/current",
      checkout: to?.checkout ?? "/pos/checkout",
    }),
    [to, tableLabel],
  );

  // Point-of-Sale context line: "Point of Sale System • Table 2 (Main) • 4 guests"
  const subtitle = [
    "Point of Sale System",
    tableLabel && `${tableLabel}${areaLabel ? ` (${areaLabel})` : ""}`,
    tableLabel && typeof guests === "number" ? `${guests} guests` : undefined,
  ]
    .filter(Boolean)
    .join(" • ");

  const nav: AppHeaderNavItem[] = [
    { to: routes.dashboard, label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { to: routes.tables, label: "Tables", icon: <Table2 className="h-4 w-4" /> },
    { to: routes.menu, label: "Menu", icon: <UtensilsCrossed className="h-4 w-4" />, activeVariant: "solid" },
    {
      to: routes.current,
      label: "Current Orders",
      icon: <ReceiptText className="h-4 w-4" />,
      badge: counts?.current,
      disabled: !!disabled?.current,
    },
  ];

  return (
    <AppHeader
      title={restaurantName}
      subtitle={subtitle}
      logo="POS"
      brandTo={routes.dashboard}
      nav={nav}
      rightExtra={rightExtra}
    />
  );
}
