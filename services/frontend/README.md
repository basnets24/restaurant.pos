# Restaurant POS Frontend (React + TypeScript + Vite)

Modern POS UI for restaurant operations: tables, ordering, payments, management, and admin. Built with React, TypeScript, Vite, TanStack Query, and a small auth layer for OIDC + multi‑tenant APIs.

## Quick Start

1) Install and run:

```
npm i
npm run dev
```

## Auth Model (OIDC + Scopes)

- Base login scopes (minimal): `openid profile roles tenancy tenant.claims.read`
  - tenancy adds tenant claims to the ID token for UI
  - tenant.claims.read ensures the Token audience includes `Tenant` when needed
- Per‑API scopes are requested on demand (no `resource` parameter):
  - Catalog (Menu): `menu.read`, `menu.write`
  - Order (Orders/Cart/Tables): `order.read`, `order.write`
  - Inventory: `inventory.read`, `inventory.write`
  - Payment: `payment.read`, `payment.charge`, `payment.refund`
  - Identity (local admin APIs): `IdentityServerApi`

Tokens are fetched via `src/auth/getApiToken.ts` using `signinSilent({ scope })`. The axios request interceptor respects per‑request Authorization headers and won’t overwrite scoped tokens.

## Multi‑Tenancy

- Tenant headers: `x-restaurant-id`, `x-location-id`
  - Set explicitly by domain APIs; also inferred from the base token in `src/lib/http.ts` if missing.
- Tenant context (rid/lid) is hydrated by `ProtectedRoute` using onboarding status from the Tenant service, and stored in `TenantContext`.

## Permissions and UI Gating

- Roles are evaluated in `src/auth/permissions.ts` via the in‑app store `src/auth/store.ts`.
- Read permissions use scopes (e.g., `menuRead` checks `menu.read`).
- Write controls are shown based on roles (Admin/Manager/…); API calls still request write scopes at call time.
- Hook: `useCan('inventoryWrite')`, `useCan('menuWrite')`, etc.

## Domain APIs (high level)

- Menu (Catalog): `src/domain/menu/service.ts` — reads `menu.read`, writes `menu.write`.
- Orders/Cart (Order): `src/domain/orders/api.ts`, `src/domain/cart/api.ts` — `order.read`/`order.write` (+ `payment.charge` on checkout).
- Tables (Order): `src/domain/tables/api.ts` — reads/writes as above + tenant headers.
- Inventory: `src/domain/inventory/service.ts` — reads `inventory.read`, writes `inventory.write`.
- Payments: `src/domain/payments/api.ts` — `payment.read` to poll session URL.
- Identity (admin users/roles): `src/domain/identity/service.ts`, `src/domain/employee/*` — `IdentityServerApi`.

## Routes

- POS: `/pos/tables`, `/pos/table/:tableId/menu` …
- Payments: success/cancel under `/pos/table/:tableId/checkout/success|cancel`
- Management: `/management` (tabs for Inventory/Menu/etc.)
- Admin: `/admin/*` (hidden from dashboard unless Admin/Owner; guarded via `ProtectedRoute`)

## Dev & Debugging

- Token debug: enable in console `window.AUTH_DEBUG = true`, then trigger actions — scoped token details (aud/scope/roles) are logged.
- Or import in console: `const m = await import('/src/auth/debug.ts'); m.logCurrentBaseToken();`
- Vite Fast Refresh: context providers for Tenant/Employee opt‑out (`/* @refresh skip */`) to avoid HMR export shape warnings.

## Troubleshooting

- Audience validation failed (e.g., `Audiences: 'Tenant' did not match 'Catalog'`):
  - Ensure the call uses a scoped token for that API (e.g., `menu.read`), and the interceptor didn’t overwrite Authorization.
- `expected scope IdentityServerApi` (Identity endpoints):
  - These calls request `IdentityServerApi` via `getApiToken` and set Authorization per request.
- 401 loops at home:
  - Global 401 redirect is disabled; `ProtectedRoute` handles auth vs onboarding. Check onboarding status and rid/lid.

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — type‑check + build
- `npm run preview` — preview built app

## Notable Files

- `src/api-authorization/oidc.ts` — OIDC client config
- `src/auth/getApiToken.ts` — scoped token retrieval (no resource indicators)
- `src/auth/permissions.ts` — permissions map + `useCan`
- `src/lib/http.ts` — axios instance + headers
- `src/app/router.tsx` — routes

## Notes

- With per‑API audiences, request at least one scope from each API you call; scopes imply audiences in the issued token.
- Roles alone are not sufficient for writes; server checks scopes and roles. The UI shows controls early (roles), but the mutation will request a write scope when called.
