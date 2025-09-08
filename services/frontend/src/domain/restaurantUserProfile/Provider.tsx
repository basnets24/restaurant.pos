import React, { createContext, useContext, useMemo } from "react";
import { createRestaurantUserProfileApi } from "./api";
import { createRestaurantUserProfileHooks } from "./hooks";
import type { RestaurantUserProfileApi } from "./api";
import { ENV } from "@/config/env";
import { useAuth } from "@/api-authorization/AuthProvider";
import { userManager } from "@/api-authorization/oidc";

type HooksBundle = ReturnType<typeof createRestaurantUserProfileHooks>;

const Ctx = createContext<HooksBundle | null>(null);

export const RestaurantUserProfileProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { getAccessToken } = useAuth();

  const hooks = useMemo(() => {
    const api = createRestaurantUserProfileApi({
      getAccessToken: async () => (await getAccessToken()) ?? null,
      baseURL: ENV.IDENTITY_URL,
    }) as RestaurantUserProfileApi;
    return createRestaurantUserProfileHooks(api, {
      onAuthRefresh: async () => {
        try { await userManager.signinSilent(); } catch {}
      }
    });
  }, [getAccessToken]);

  return <Ctx.Provider value={hooks}>{children}</Ctx.Provider>;
};

export function useRestaurantUserProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRestaurantUserProfile must be used within RestaurantUserProfileProvider");
  return ctx;
}
