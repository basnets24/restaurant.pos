import { useCallback } from "react";

// Very small persistent store for POS table sessions.
// No external deps; persists to localStorage.

type TableSession = {
  cartId?: string | null;
  guestCount?: number | null;
  updatedAt?: number;
};

const LS_KEY = "pos.table.sessions.v1";

function readAll(): Record<string, TableSession> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, TableSession>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch {
    // ignore quota/SSR guards
  }
}

function get(tableId: string): TableSession | undefined {
  const all = readAll();
  return all[tableId] ?? undefined;
}

function set(tableId: string, patch: Partial<TableSession>) {
  const all = readAll();
  const prev = all[tableId] ?? {};
  const next: TableSession = { ...prev, ...patch, updatedAt: Date.now() };
  all[tableId] = next;
  writeAll(all);
  return next;
}

function clear(tableId: string) {
  const all = readAll();
  delete all[tableId];
  writeAll(all);
}

// Expose a simple hook returning stable helpers
export function useStore() {
  const getTableSession = useCallback((tableId: string) => get(tableId), []);
  const setTableSession = useCallback((tableId: string, patch: Partial<TableSession>) => set(tableId, patch), []);
  const clearTableSession = useCallback((tableId: string) => clear(tableId), []);
  return { getTableSession, setTableSession, clearTableSession };
}

export type { TableSession };

