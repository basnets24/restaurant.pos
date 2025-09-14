/* @refresh skip */
import React, { createContext, useContext, useMemo } from "react";
import { createTenantApi } from "./api";
import { createTenantHooks } from "./hooks";
import type { TenantApi } from "./api";
import { ENV } from "@/config/env";
import { useAuth } from "@/api-authorization/AuthProvider";

type HooksBundle = ReturnType<typeof createTenantHooks>;

const TenantCtx = createContext<HooksBundle | null>(null);

export const TenantDomainProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { getAccessToken } = useAuth();
  const hooks = useMemo(() => {
    const api = createTenantApi({
      getAccessToken: async () => (await getAccessToken()) ?? null,
      baseURL: ENV.TENANT_URL,
    }) as TenantApi;
    return createTenantHooks(api);
  }, [getAccessToken]);

  return <TenantCtx.Provider value={hooks}>{children}</TenantCtx.Provider>;
};

export function useTenantDomain() {
  const ctx = useContext(TenantCtx);
  if (!ctx) throw new Error("useTenantDomain must be used within TenantDomainProvider");
  return ctx;
}
