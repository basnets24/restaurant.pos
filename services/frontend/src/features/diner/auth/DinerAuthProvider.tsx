import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { DinerAuth, type DinerSession } from "./dinerAuth";

interface DinerAuthContextValue {
  session: DinerSession | null;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => void;
  /** A currently-valid access token, refreshing first if it is about to expire. Null when the
   *  diner is signed out or the refresh failed - callers must treat that as "sign in again". */
  getToken: () => Promise<string | null>;
}

const DinerAuthContext = createContext<DinerAuthContextValue | null>(null);

/**
 * Holds the diner's session. Entirely separate from `AuthProvider`, which owns the staff
 * OIDC session: the two can be signed in at once in the same browser (a staff member ordering
 * lunch from their own restaurant), and neither should see the other's token.
 */
export function DinerAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DinerSession | null>(() => DinerAuth.load());

  // Refreshes are deduped through a promise ref rather than state: several requests can fire
  // at once on a page load, and each seeing "not refreshing yet" would start its own refresh
  // and invalidate the others' refresh tokens.
  const refreshing = useRef<Promise<DinerSession | null> | null>(null);

  useEffect(() => {
    DinerAuth.save(session);
  }, [session]);

  const getToken = useCallback<DinerAuthContextValue["getToken"]>(async () => {
    // Reads `session` from this render, NOT localStorage. Storage is written by the effect
    // above, which has not flushed yet at the moment a just-signed-in caller asks for a token -
    // so reading it back returned null and the checkout quote failed with "signed out" on the
    // one path that matters most. Storage is for rehydrating on mount, nothing else.
    const current = session;
    if (!current) return null;
    if (current.expiresAt > Date.now()) return current.accessToken;

    refreshing.current ??= DinerAuth.refresh(current).finally(() => {
      refreshing.current = null;
    });

    const next = await refreshing.current;
    setSession(next);
    return next?.accessToken ?? null;
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    setSession(await DinerAuth.signIn(email, password));
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    await DinerAuth.register(email, password, displayName);
    // Sign straight in - being bounced to a login form after creating an account mid-order
    // is exactly the friction the inline flow exists to avoid.
    setSession(await DinerAuth.signIn(email, password));
  }, []);

  const signOut = useCallback(() => setSession(null), []);

  const value = useMemo(
    () => ({ session, isSignedIn: session !== null, signIn, register, signOut, getToken }),
    [session, signIn, register, signOut, getToken]
  );

  return <DinerAuthContext.Provider value={value}>{children}</DinerAuthContext.Provider>;
}

export function useDinerAuth(): DinerAuthContextValue {
  const ctx = useContext(DinerAuthContext);
  if (!ctx) throw new Error("useDinerAuth must be used inside a DinerAuthProvider");
  return ctx;
}
