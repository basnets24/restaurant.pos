import { useMemo, useSyncExternalStore } from "react";

const LS_RID = "rid";
const LS_LID = "lid";

function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`tenant: failed to read ${key} from localStorage`, e);
    return null;
  }
}

function writeLS(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch (e) {
    console.warn(`tenant: failed to persist ${key} to localStorage`, e);
  }
}

// Hydrated synchronously at module load - this is a client-only SPA (no SSR),
// so there's no hydration-race window like there was with the old
// useEffect-on-mount TenantContext implementation.
let snapshot = { rid: readLS(LS_RID), lid: readLS(LS_LID) };
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

export function setRid(value: string | null) {
  if (snapshot.rid === value) return;
  snapshot = { ...snapshot, rid: value };
  writeLS(LS_RID, value);
  notify();
}

export function setLid(value: string | null) {
  if (snapshot.lid === value) return;
  snapshot = { ...snapshot, lid: value };
  writeLS(LS_LID, value);
  notify();
}

export function clearTenant() {
  setRid(null);
  setLid(null);
}

// Plain-function accessor for non-component API modules (domain/*.ts via
// auth/tenantHeaders.ts) - the single source of truth for tenant HTTP headers,
// replacing the old JWT-claims-derived tenantAccessor().
export function getTenant(): { restaurantId?: string; locationId?: string } | undefined {
  return snapshot.rid ? { restaurantId: snapshot.rid, locationId: snapshot.lid ?? undefined } : undefined;
}

export function useTenant() {
  const s = useSyncExternalStore(subscribe, getSnapshot);
  return useMemo(
    () => ({ rid: s.rid, lid: s.lid, setRid, setLid, clear: clearTenant }),
    [s.rid, s.lid]
  );
}
