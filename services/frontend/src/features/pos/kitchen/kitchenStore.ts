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
  selectedCartId?: string | null;
};

const LS_KEY = "pos.kitchen.tickets.v1";

function read(): KitchenState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { tickets: [], selectedCartId: null };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { tickets: [], selectedCartId: null };
    const obj = parsed as Record<string, unknown>;
    const tickets = Array.isArray(obj.tickets) ? (obj.tickets as KitchenTicket[]) : [];
    const selectedCartId = typeof obj.selectedCartId === "string" ? obj.selectedCartId : null;
    return { tickets, selectedCartId };
  } catch {
    return { tickets: [], selectedCartId: null };
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
// tenant-local caches on sign-out - useKitchen()'s clearAll requires being
// inside a component.
export function clearKitchenState() {
  setState({ tickets: [], selectedCartId: null });
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
      serve: (cartId: string) => {
        setState({
          tickets: state.tickets.map((t) =>
            t.id === cartId && t.status === "fired" ? { ...t, status: "served" } : t,
          ),
        });
      },
      remove: (cartId: string) => {
        setState({ tickets: state.tickets.filter((t) => t.id !== cartId) });
      },
      // "served" means the kitchen delivered the food, not that the guest paid -
      // the cart must stay locked (no more adding items / re-firing) until the
      // order reaches a terminal state. Only "voided" - which also releases the
      // table - actually reopens the cart.
      isFired: (cartId?: string | null) =>
        !!cartId && state.tickets.some((t) => t.id === cartId && t.status !== "voided"),
      active: () => state.tickets.filter((t) => t.status === "fired"),
      all: () => state.tickets.slice(),
      setSelected: (cartId: string | null) => setState({ selectedCartId: cartId }),
      selected: () => state.tickets.find(t => t.id === state.selectedCartId && t.status === "fired"),
      defaultMenuTarget: (): { tableId: string; cartId: string } | undefined => {
        const sel = state.tickets.find(t => t.id === state.selectedCartId && t.status === "fired");
        if (sel) return { tableId: sel.tableId, cartId: sel.id };
        const act = state.tickets.filter(t => t.status === "fired");
        if (act.length === 1) return { tableId: act[0].tableId, cartId: act[0].id };
        return undefined;
      },
      clearAll: () => setState({ tickets: [] }),
    };
  }, []);

  return { ...current, ...actions };
}
