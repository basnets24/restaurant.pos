/* @refresh skip */
import React, { createContext, useContext, useMemo } from "react";
import { createTenantApi } from "./api";
import { createTenantHooks } from "./hooks";
import type { TenantApi } from "./api";
import { ENV } from "@/config/env";
import { getApiToken } from "@/auth/getApiToken";

type HooksBundle = ReturnType<typeof createTenantHooks>;

const TenantCtx = createContext<HooksBundle | null>(null);

export const TenantDomainProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const hooks = useMemo(() => {
    const api = createTenantApi({
      getAccessToken: async () => (await getApiToken("IdentityServerApi", ["IdentityServerApi"])) ?? null,
      baseURL: ENV.IDENTITY_URL,
    }) as TenantApi;
    return createTenantHooks(api);
  }, []);

  return <TenantCtx.Provider value={hooks}>{children}</TenantCtx.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useTenantDomain() {
  const ctx = useContext(TenantCtx);
  if (!ctx) throw new Error("useTenantDomain must be used within TenantDomainProvider");
  return ctx;
}
