import React from "react";
import { useCan } from "./permissions";

type RequireProps = {
  anyOf?: (keyof ReturnType<typeof buildMap>)[];
  check?: () => boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

function buildMap() {
  return {
    menuRead: () => useCan("menuRead"),
    menuWrite: () => useCan("menuWrite"),
    orderRead: () => useCan("orderRead"),
    orderWrite: () => useCan("orderWrite"),
    inventoryRead: () => useCan("inventoryRead"),
    inventoryWrite: () => useCan("inventoryWrite"),
    paymentCharge: () => useCan("paymentCharge"),
    paymentRefund: () => useCan("paymentRefund"),
  } as const;
}

/**
 * Simple wrapper to conditionally render children based on permissions.
 * Use either `check` for custom logic or `anyOf` with built-in keys.
 */
export function Require({ anyOf, check, fallback = null, children }: RequireProps) {
  const map = buildMap();
  let ok = false;
  if (typeof check === "function") ok = !!check();
  else if (anyOf && anyOf.length > 0) ok = anyOf.some((k) => map[k]() === true);
  else ok = true;
  return ok ? <>{children}</> : <>{fallback}</>;
}

