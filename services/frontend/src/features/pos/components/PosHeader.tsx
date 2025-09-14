import { NavLink, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/api-authorization/AuthProvider";
import { useUserDisplayName } from "@/hooks/useUserDisplayName";
import { AuthorizationPaths } from "@/api-authorization/ApiAuthorizationConstants";
import {
  LayoutDashboard,
  Table2,
  UtensilsCrossed,
  ReceiptText,
  CircleUserRound,
  User,
  ShieldCheck,
  Bell,
  LogOut,
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
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { displayName } = useUserDisplayName();
  const onLogout = () => void signOut(`${window.location.origin}${AuthorizationPaths.DefaultLoginRedirectPath}`);
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

  const subtitle = (
    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
      <span>Point of Sale System</span>
      {tableLabel && (
        <>
          <span>•</span>
          <span className="text-foreground">{tableLabel}</span>
          {areaLabel && (
            <span className="text-muted-foreground">({areaLabel})</span>
          )}
          {typeof guests === "number" && (
            <>
              <span>•</span>
              <span>{guests} guests</span>
            </>
          )}
        </>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 py-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Brand + names */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-xl bg-primary text-primary-foreground grid place-items-center shrink-0"
              title="POS"
            >
              <span className="text-[11px] font-bold tracking-wide">POS</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-semibold truncate">
                  {restaurantName}
                </h1>
              </div>
              {subtitle}
            </div>
          </div>

          {/* Center: Nav */}
          <nav className="hidden md:flex items-center gap-2">
            <NavButton
              to={routes.dashboard}
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Dashboard"
            />
            <NavButton
              to={routes.tables}
              icon={<Table2 className="h-4 w-4" />}
              label="Tables"
            />
            <NavButton
              to={routes.menu}
              icon={<UtensilsCrossed className="h-4 w-4" />}
              label="Menu"
              variantActive="solid"
            />
            <NavButton
              to={routes.current}
              icon={<ReceiptText className="h-4 w-4" />}
              label="Current Orders"
              badge={counts?.current}
              disabled={!!disabled?.current}
            />
          </nav>

          {/* Right: optional extras, profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {rightExtra}
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <CircleUserRound className="h-4 w-4" />
                  <span className="hidden sm:inline">{displayName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">Signed in as</DropdownMenuLabel>
                <div className="px-2 pb-1 text-sm truncate">{displayName}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
      </div>

        {/* Mobile nav row */}
        <div className="md:hidden pt-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <NavChip to={routes.dashboard} label="Dashboard" />
          <NavChip to={routes.tables} label="Tables" />
          <NavChip to={routes.menu} label="Menu" active />
          <NavChip to={routes.current} label="Current Orders" disabled={!!disabled?.current} />
        </div>
      </div>
    </header>
  );
}

/** Desktop nav button with active styling using NavLink */
function NavButton({
  to,
  icon,
  label,
  badge,
  disabled,
  variantActive = "soft",
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  disabled?: boolean;
  /** "soft" = ghost w/active tint, "solid" = filled when active (for primary like Menu) */
  variantActive?: "soft" | "solid";
}) {
  return (
    <NavLink to={to} className="group">
      {({ isActive }) => (
        <Button
          type="button"
          variant={isActive && variantActive === "solid" ? "default" : "ghost"}
          size="sm"
          className={`gap-2 ${isActive && variantActive === "soft" ? "bg-primary/10 text-foreground" : ""}`}
          disabled={disabled}
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
          {!!badge && (
            <Badge variant="secondary" className="ml-1">
              {badge}
            </Badge>
          )}
        </Button>
      )}
    </NavLink>
  );
}

/** Mobile chips */
function NavChip({
  to,
  label,
  active,
  disabled,
}: {
  to: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <NavLink to={to} className="shrink-0">
      <Button
        type="button"
        variant={active ? "default" : "outline"}
        size="sm"
        disabled={disabled}
        className="rounded-full"
      >
        {label}
      </Button>
    </NavLink>
  );
}
