// Re-export shim: tenant state now lives in a plain external store
// (src/auth/tenant.ts, useSyncExternalStore-based, same pattern as
// auth/permissions.ts's granted-scopes accumulator) so both React components
// and non-component API modules read the same live source. No provider is
// needed for module state - main.tsx no longer wraps <TenantProvider>.
export { useTenant } from "@/auth/tenant";
