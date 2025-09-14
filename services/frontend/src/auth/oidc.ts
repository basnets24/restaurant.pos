import { UserManager, WebStorageStateStore, type User } from "oidc-client-ts";
import { ApplicationName, AuthorizationPaths } from "@/api-authorization/ApiAuthorizationConstants";

export const BASE_ID_SCOPES = "openid profile roles tenancy tenant.claims.read";

const origin = window.location.origin;
const authority = import.meta.env.VITE_IDENTITY_URL;
if (!authority) {
  throw new Error("VITE_IDENTITY_URL is missing");
}

const requestedScope = import.meta.env.VITE_OIDC_SCOPE ?? BASE_ID_SCOPES;

export const oidc = new UserManager({
  authority,
  client_id: "frontend",
  redirect_uri: `${origin}${AuthorizationPaths.LoginCallback}`,
  response_type: "code",
  scope: requestedScope,
  post_logout_redirect_uri: `${origin}${AuthorizationPaths.LogOutCallback}`,
  automaticSilentRenew: true,
  includeIdTokenInSilentRenew: true,
  userStore: new WebStorageStateStore({ prefix: ApplicationName }),
});

oidc.events.addUserSignedOut(async () => {
  await oidc.removeUser();
});

export async function getCurrentUser(): Promise<User | null> {
  try {
    return await oidc.getUser();
  } catch {
    return null;
  }
}

