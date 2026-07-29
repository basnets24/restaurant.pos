import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type TenantState = {
  rid: string | null;
  lid: string | null;
  setRid: (rid: string | null) => void;
  setLid: (lid: string | null) => void;
  clear: () => void;
};

const TenantCtx = createContext<TenantState | null>(null);

const LS_RID = "rid";
const LS_LID = "lid";

export const TenantProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [rid, setRidState] = useState<string | null>(null);
  const [lid, setLidState] = useState<string | null>(null);

  // hydrate from localStorage on mount
  useEffect(() => {
    try {
      const r = localStorage.getItem(LS_RID);
      const l = localStorage.getItem(LS_LID);
      if (r) setRidState(r);
      if (l) setLidState(l);
    } catch (e) {
      console.warn("TenantContext: failed to hydrate tenant from localStorage", e);
    }
  }, []);

  const setRid = useCallback((value: string | null) => {
    setRidState(value);
    try {
      if (value) localStorage.setItem(LS_RID, value);
      else localStorage.removeItem(LS_RID);
    } catch (e) {
      console.warn("TenantContext: failed to persist restaurantId to localStorage", e);
    }
  }, []);

  const setLid = useCallback((value: string | null) => {
    setLidState(value);
    try {
      if (value) localStorage.setItem(LS_LID, value);
      else localStorage.removeItem(LS_LID);
    } catch (e) {
      console.warn("TenantContext: failed to persist locationId to localStorage", e);
    }
  }, []);

  const clear = useCallback(() => {
    setRid(null);
    setLid(null);
  }, [setRid, setLid]);

  const value = useMemo<TenantState>(
    () => ({ rid, lid, setRid, setLid, clear }),
    [rid, lid, setRid, setLid, clear]
  );

  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
};

export function useTenant() {
  const ctx = useContext(TenantCtx);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}

