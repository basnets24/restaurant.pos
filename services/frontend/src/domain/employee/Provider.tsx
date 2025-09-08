import React, { createContext, useContext, useMemo } from "react";
import { createEmployeeApi } from "./api";
import { createEmployeeHooks } from "./hooks";
import type { EmployeeApi } from "./api";
import { ENV } from "@/config/env";
import { useAuth } from "@/api-authorization/AuthProvider";

type HooksBundle = ReturnType<typeof createEmployeeHooks>;

const EmployeeCtx = createContext<HooksBundle | null>(null);

export const EmployeeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { getAccessToken } = useAuth();

  const hooks = useMemo(() => {
    const api = createEmployeeApi({
      getAccessToken: async () => (await getAccessToken()) ?? null,
      baseURL: ENV.IDENTITY_URL,
    }) as EmployeeApi;
    return createEmployeeHooks(api);
  }, [getAccessToken]);

  return <EmployeeCtx.Provider value={hooks}>{children}</EmployeeCtx.Provider>;
};

export function useEmployeeDomain() {
  const ctx = useContext(EmployeeCtx);
  if (!ctx) throw new Error("useEmployeeDomain must be used within EmployeeProvider");
  return ctx;
}

