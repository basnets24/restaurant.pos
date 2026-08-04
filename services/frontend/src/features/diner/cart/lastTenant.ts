import { useSyncExternalStore } from "react";
import type { DinerTenant } from "@/domain/dinerOrders";

/**
 * The restaurant a diner most recently ordered from.
 *
 * Needed because every diner API call carries explicit tenant headers, but the cart - which is
 * where the tenant normally comes from - is cleared the moment an order is placed. The order
 * confirmation page then has an order id and nothing to scope it with.
 *
 * A diner token has no tenant claims to fall back on, so this has to be remembered rather than
 * derived. Written at checkout, read afterwards; not authoritative for anything (the server
 * still scopes every read to the caller's own orders).
 */

const STORAGE_KEY = "spoontab.diner.tenant";

const listeners = new Set<() => void>();
let cached: DinerTenant | null | undefined;

function read(): DinerTenant | null {
  if (cached !== undefined) return cached;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cached = raw ? (JSON.parse(raw) as DinerTenant) : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function rememberDinerTenant(tenant: DinerTenant) {
  cached = tenant;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tenant));
  } catch {
    // Private browsing - the in-memory value still serves this session.
  }
  listeners.forEach((l) => l());
}

export function useDinerLastTenant(): DinerTenant | null {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    read,
    () => null
  );
}
