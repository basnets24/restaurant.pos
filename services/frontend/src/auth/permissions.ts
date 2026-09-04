import { useSyncExternalStore } from "react";
import { useAuth } from "@/api-authorization/AuthProvider";

const hasRole = (roles: string[] | undefined, allowed: string[]) =>
  !!roles?.some((r) => allowed.includes(r));

const hasScope = (scopes: string[] | undefined, s: string) =>
  !!scopes?.includes(s);

// ─────────────────────────────────────────────────────────────────────────────
// Granted-scopes accumulator. Duende issues scopes per-token, so there's no
// single "all scopes" token — getApiToken() calls addGrantedScopes() with
// whatever scopes it successfully obtained, and this accumulates across the
// session so `can.*` scope checks reflect what's actually been granted so far.
// ─────────────────────────────────────────────────────────────────────────────
const grantedScopes = new Set<string>();
let grantedScopesSnapshot: string[] = [];
const listeners = new Set<() => void>();

// Read-only snapshot for callers that need to union against it (see getApiToken.ts's
// mintToken) rather than just react to it via the hook.
export function getGrantedScopes(): string[] {
  return grantedScopesSnapshot;
}

export function addGrantedScopes(scopes: string[]) {
  let changed = false;
  for (const s of scopes) {
    if (!grantedScopes.has(s)) {
      grantedScopes.add(s);
      changed = true;
    }
  }
  if (changed) {
    grantedScopesSnapshot = Array.from(grantedScopes);
    listeners.forEach((l) => l());
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useGrantedScopes(): string[] {
  return useSyncExternalStore(subscribe, () => grantedScopesSnapshot);
}

function normalizeRoles(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export const can = {
  // Staff/Employees
  manageStaff: (roles: string[]) => hasRole(roles, ["Admin", "Manager"]),
  manageRoles: (roles: string[]) => hasRole(roles, ["Admin"]),

  // Menu
  menuRead: (_roles: string[], scopes: string[]) => hasScope(scopes, "menu.read"),
  menuWrite: (roles: string[]) =>
    // UI gating: show write controls based on roles only; API calls still request write scopes at call time.
    hasRole(roles, ["Admin", "Manager", "Chef"]),

  // Orders
  orderRead: (_roles: string[], scopes: string[]) => hasScope(scopes, "order.read"),
  orderWrite: (roles: string[]) =>
    // UI gating by roles; server enforces scope + role on mutation.
    hasRole(roles, ["Admin", "Manager", "Server"]),

  // Payments
  paymentCharge: (roles: string[], scopes: string[]) =>
    hasScope(scopes, "payment.charge") && hasRole(roles, ["Admin", "Manager"]),
  paymentRefund: (roles: string[], scopes: string[]) =>
    hasScope(scopes, "payment.refund") && hasRole(roles, ["Admin"]),
} as const;

// Hook for components
export function useCan<K extends keyof typeof can>(k: K) {
  const { profile } = useAuth();
  const roles = normalizeRoles(profile?.role);
  const scopes = useGrantedScopes();
  return can[k](roles, scopes);
}
