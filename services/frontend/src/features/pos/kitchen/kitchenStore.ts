// A tiny local store for KDS-lite tickets with localStorage persistence.
// (Lightweight Zustand-like pattern using useSyncExternalStore)

import { useMemo } from "react";
import { useSyncExternalStore } from "react";

export type KitchenTicket = {
  id: string; // cartId
  tableId: string;
  tableNumber?: string | null;
  items: { name: string; quantity: number }[];
  firedAt: number; // epoch ms
  status: "fired" | "served" | "voided";
};

type KitchenState = {
  tickets: KitchenTicket[];
};

const LS_KEY = "pos.kitchen.tickets.v1";

function read(): KitchenState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { tickets: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { tickets: [] };
    const obj = parsed as Record<string, unknown>;
    const tickets = Array.isArray(obj.tickets) ? (obj.tickets as KitchenTicket[]) : [];
    return { tickets };
  } catch {
    return { tickets: [] };
  }
}

function write(s: KitchenState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch (e) {
    console.warn("kitchenStore: failed to persist state to localStorage", e);
  }
}

let state: KitchenState = read();
const subs = new Set<() => void>();

function setState(partial: Partial<KitchenState>) {
  state = { ...state, ...partial };
  write(state);
  subs.forEach((fn) => fn());
}

function subscribe(cb: () => void) {
  subs.add(cb);
  return () => subs.delete(cb);
}

// Plain (non-hook) reset for callers outside React, e.g. AuthProvider clearing
// tenant-local caches on sign-out.
export function clearKitchenState() {
  setState({ tickets: [] });
}

export function useKitchen() {
  // Only client-side; server snapshot not needed
  const current = useSyncExternalStore(subscribe, () => state);

  const actions = useMemo(() => {
    return {
      fire: (ticket: Omit<KitchenTicket, "status">) => {
        // If a live ticket already exists for this cart (fired or already
        // served), no-op - only a voided ticket frees the id up to be fired
        // again. Matching on "fired" alone let a served-but-unpaid order get
        // re-fired as a brand new duplicate ticket once it dropped out of the
        // "fired" bucket, showing the kitchen more items than the guest's
        // order/bill actually has.
        if (state.tickets.some((t) => t.id === ticket.id && t.status !== "voided")) return;
        setState({ tickets: [...state.tickets, { ...ticket, status: "fired" }] });
      },
      void: (cartId: string) => {
        setState({
          tickets: state.tickets.map((t) =>
            t.id === cartId && t.status === "fired" ? { ...t, status: "voided" } : t,
          ),
        });
      },
      // "served"/active-orders/nav-badge status now comes from the server
      // (Order.ServedAt via useActiveOrders/useIsFired) - see MenuPage's old
      // `kitchen.isFired(cartId)`-only check for why local-only state here was
      // a bug across multiple terminals. `isFired` still consults the local
      // ticket as an instant fallback right after this terminal fires, before
      // the order query has refetched.
      isFired: (cartId?: string | null) =>
        !!cartId && state.tickets.some((t) => t.id === cartId && t.status !== "voided"),
    };
  }, []);

  return { ...current, ...actions };
}
