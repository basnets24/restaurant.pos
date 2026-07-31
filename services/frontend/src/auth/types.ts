import type { UserProfile } from "oidc-client-ts";

/**
 * Custom claims IdentityService puts on the id/access token beyond the
 * standard OIDC claim set — restaurant/location context and tenant role(s).
 * Both snake_case and camelCase variants exist in the wild; callers should
 * check both (see AuthProvider's getTenant binding).
 */
export type TenantClaims = {
  restaurant_id?: string;
  restaurantId?: string;
  location_id?: string;
  locationId?: string;
  role?: string | string[];
};

/** The shape of `AuthProvider`'s `profile` — OIDC standard claims + our tenant claims. */
export type AppProfile = UserProfile & TenantClaims;

/** App-supplied `state` carried through the sign-in/sign-out redirect round trip. */
export type SignInState = {
  returnUrl?: string;
};
