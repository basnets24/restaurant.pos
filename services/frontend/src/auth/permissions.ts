import { useAuth } from "./store";

const hasRole = (roles: string[] | undefined, allowed: string[]) =>
  !!roles?.some((r) => allowed.includes(r));

const hasScope = (scopes: string[] | undefined, s: string) =>
  !!scopes?.includes(s);

export const can = {
  // Staff/Employees
  manageStaff: () => {
    const g = useAuth.getState().grants ?? undefined;
    return hasRole(g?.roles ?? [], ["Admin", "Manager"]);
  },
  manageRoles: () => {
    const g = useAuth.getState().grants ?? undefined;
    return hasRole(g?.roles ?? [], ["Admin"]);
  },
  // Menu
  menuRead: () => {
    const g = useAuth.getState().grants ?? undefined;
    return hasScope(g?.scopes ?? [], "menu.read");
  },
  menuWrite: () => {
    const g = useAuth.getState().grants ?? undefined;
    // UI gating: show write controls based on roles only; API calls still request write scopes at call time.
    return hasRole(g?.roles ?? [], ["Admin", "Manager", "Chef"]);
  },

  // Orders
  orderRead: () => {
    const g = useAuth.getState().grants ?? undefined;
    return hasScope(g?.scopes ?? [], "order.read");
  },
  orderWrite: () => {
    const g = useAuth.getState().grants ?? undefined;
    // UI gating by roles; server enforces scope + role on mutation.
    return hasRole(g?.roles ?? [], ["Admin", "Manager", "Server"]);
  },

  // Inventory
  inventoryRead: () => {
    const g = useAuth.getState().grants ?? undefined;
    return hasScope(g?.scopes ?? [], "inventory.read");
  },
  inventoryWrite: () => {
    const g = useAuth.getState().grants ?? undefined;
    // UI gating by roles; server enforces scope + role on mutation.
    return hasRole(g?.roles ?? [], ["Admin", "Manager"]);
  },

  // Payments
  paymentCharge: () => {
    const g = useAuth.getState().grants ?? undefined;
    return (
      hasScope(g?.scopes ?? [], "payment.charge") &&
      hasRole(g?.roles ?? [], ["Admin", "Manager"])
    );
  },
  paymentRefund: () => {
    const g = useAuth.getState().grants ?? undefined;
    return (
      hasScope(g?.scopes ?? [], "payment.refund") &&
      hasRole(g?.roles ?? [], ["Admin"])
    );
  },
} as const;

// Hook for components
export function useCan<K extends keyof typeof can>(k: K) {
  // subscribe to store to re-render when grants change
  useAuth((s) => s.grants);
  return (can[k] as () => boolean)();
}
