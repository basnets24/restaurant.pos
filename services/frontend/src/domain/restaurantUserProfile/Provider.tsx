import React, { createContext, useContext, useMemo } from "react";
import { createRestaurantUserProfileApi } from "./api";
import { createRestaurantUserProfileHooks } from "./hooks";
import type { RestaurantUserProfileApi } from "./api";
import { ENV } from "@/config/env";
import { getApiToken } from "@/auth/getApiToken";
import { userManager } from "@/api-authorization/oidc";

type HooksBundle = ReturnType<typeof createRestaurantUserProfileHooks>;

const Ctx = createContext<HooksBundle | null>(null);

export const RestaurantUserProfileProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const hooks = useMemo(() => {
    const api = createRestaurantUserProfileApi({
      getAccessToken: async () => (await getApiToken("IdentityServerApi", ["IdentityServerApi"])) ?? null,
      identityBaseURL: ENV.IDENTITY_URL,
      tenantBaseURL: ENV.IDENTITY_URL,
    }) as RestaurantUserProfileApi;
    return createRestaurantUserProfileHooks(api, {
      onAuthRefresh: async () => {
        try { await userManager.signinSilent(); } catch (e) { console.warn("RestaurantUserProfileProvider: silent auth refresh failed", e); }
      }
    });
  }, []);

  return <Ctx.Provider value={hooks}>{children}</Ctx.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function useRestaurantUserProfile() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRestaurantUserProfile must be used within RestaurantUserProfileProvider");
  return ctx;
}
