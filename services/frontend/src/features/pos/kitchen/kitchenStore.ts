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
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { tickets: [], selectedCartId: null };
    const t = Array.isArray((parsed as any).tickets) ? (parsed as any).tickets : [];
    const selectedCartId = (parsed as any).selectedCartId ?? null;
    return { tickets: t, selectedCartId } as KitchenState;
  } catch {
    return { tickets: [], selectedCartId: null };
  }
}

function write(s: KitchenState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {}
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

export function useKitchen() {
  // Only client-side; server snapshot not needed
  const current = useSyncExternalStore(subscribe, () => state);

  const actions = useMemo(() => {
    return {
      fire: (ticket: Omit<KitchenTicket, "status">) => {
        // If already present, no-op
        if (state.tickets.some((t) => t.id === ticket.id && t.status === "fired")) return;
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
      isFired: (cartId?: string | null) =>
        !!cartId && state.tickets.some((t) => t.id === cartId && t.status === "fired"),
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
