import React from "react";
import { useCan } from "./permissions";

// Subset of `can`'s keys this component supports (excludes manageStaff/manageRoles,
// which take a different signature and aren't gated through Require).
type PermissionKey =
  | "menuRead"
  | "menuWrite"
  | "orderRead"
  | "orderWrite"
  | "inventoryRead"
  | "inventoryWrite"
  | "paymentCharge"
  | "paymentRefund";

type RequireProps = {
  anyOf?: PermissionKey[];
  check?: () => boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Simple wrapper to conditionally render children based on permissions.
 * Use either `check` for custom logic or `anyOf` with built-in keys.
 */
export function Require({ anyOf, check, fallback = null, children }: RequireProps) {
  // Every permission hook runs unconditionally, every render — anyOf's
  // membership must not gate which hooks fire (Rules of Hooks).
  const permissions: Record<PermissionKey, boolean> = {
    menuRead: useCan("menuRead"),
    menuWrite: useCan("menuWrite"),
    orderRead: useCan("orderRead"),
    orderWrite: useCan("orderWrite"),
    inventoryRead: useCan("inventoryRead"),
    inventoryWrite: useCan("inventoryWrite"),
    paymentCharge: useCan("paymentCharge"),
    paymentRefund: useCan("paymentRefund"),
  };

  let ok: boolean;
  if (typeof check === "function") ok = !!check();
  else if (anyOf && anyOf.length > 0) ok = anyOf.some((k) => permissions[k] === true);
  else ok = true;
  return ok ? <>{children}</> : <>{fallback}</>;
}

