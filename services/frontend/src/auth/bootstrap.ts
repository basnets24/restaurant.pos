import { getCurrentUser } from "./oidc";
import { useAuth } from "./store";

/**
 * Initialize the client-side auth store from the current OIDC user, if any.
 * Call this once during app startup (e.g., before rendering Router).
 */
export async function bootstrapAuth() {
  const user = await getCurrentUser();
  const roles = normalizeRoles(user?.profile?.role);
  const scopes = (user as any)?.scope
    ? String((user as any).scope).split(/\s+/).filter(Boolean)
    : [];

  useAuth.setUser({ sub: user?.profile?.sub as string | undefined, name: (user?.profile as any)?.name, roles });
  useAuth.setGrants({ roles, scopes });
}

function normalizeRoles(raw: unknown): string[] | undefined {
  if (!raw) return [];
  return Array.isArray(raw) ? (raw as string[]) : [String(raw)];
}

