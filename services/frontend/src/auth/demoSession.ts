import type { AppProfile } from "./types";

// DemoAdminGrantValidator (identity service) issues every demo_admin-grant token with
// `amr: "demo_admin"` (Duende's GrantValidationResult authenticationMethod parameter) - the
// one claim that distinguishes a one-click demo session from a real Authorization Code staff
// session sharing the same subject/roles/scopes.
export function isDemoProfile(profile: AppProfile | null | undefined): boolean {
  const amr = profile?.amr;
  if (typeof amr === "string") return amr === "demo_admin";
  if (Array.isArray(amr)) return amr.includes("demo_admin");
  return false;
}
