# Diner Ordering — Implementation Plan

Working plan for building the customer-facing pickup-ordering surface described in ADR-001
and the "Diner Ordering — System Design" artifact
(`https://claude.ai/code/artifact/0dd66291-0688-49c2-8880-88da38debb38`).

Design reference: `/Users/swornimbasnet/Downloads/design_handoff_diner_ordering/Diner Ordering.dc.html`
(click-through prototype, mock data — reference only, not code to port).

Every claim below was checked against the code on 2026-08-03. Line references are to `dev`.

---

## The shape of the problem

The platform today is **100% authenticated and 100% staff-scoped**. There is not one
`[AllowAnonymous]` endpoint in any of the four services, and the write paths additionally
require a staff role:

| Gate | Where | Effect on a diner |
|---|---|---|
| `orders.write` policy requires role `Admin`/`Manager`/`Server` | `services/order/src/OrderService/Auth/OrderPolicyExtensions.cs:23` | A signed-in diner cannot create a cart or place an order |
| `POST /carts` is `[Authorize(Policy = Write)]` | `services/order/src/OrderService/Controllers/CartController.cs:30` | Same |
| Every `/menu-items` route requires `menu.read` | `services/catalog/src/CatalogService/Controllers/MenuItemsController.cs` | A diner cannot browse a menu before signing in |
| No public restaurant list exists at all | identity `Features/Tenancy/` | Discovery has no data source |
| `TenantMiddleware` falls back to `acme-bistro`/`sjc-01` when headers are absent | `Common.Library` | An anonymous request that forgets tenant headers silently reads the **wrong restaurant** |

So the bulk of Phase 0 is authorization surface, not features. Do not start UI work first —
the auth model is the thing most likely to force rework.

The good news, verified in code: **the pickup path already works end-to-end at the domain
layer.** `Cart.TableId` and `Order.TableId` are already `Guid?`
(`Entities/Cart.cs:12`, `Entities/Order.cs:15`), `FinalOrderService` already passes
`TableId: dto.TableId ?? Guid.Empty` to `OrderSubmitted` and already varies pricing on
`DineIn: dto.TableId != null` (`Services/FinalOrderService.cs:55,68`), and `MarkPaidAsync`
already guards `order.TableId is Guid` before touching a table (`:86`). No refactor needed there.

---

## Hard constraints to plan around

1. **`Tenant.Domain` is consumed as a NuGet package, not a project reference.**
   `IdentityService.csproj:25` pins `Tenant.Domain` `2.0.0`. Adding fields to `Location`
   is a three-step round trip: edit → bump `<Version>` → push to `dev` → wait for the
   feed → bump the `PackageReference`. **CI does not bump the version for you** and
   `--skip-duplicate` makes a forgotten bump a silent no-op. Same for
   `Messaging.Contracts` (`1.0.4`, used by order + catalog).
   Budget for this friction; batch all shared-library changes into as few round trips as possible.

2. **The order service is pinned to `net8.0` + MassTransit 8.4.0** (`OrderService.csproj:4,17`)
   because MassTransit 9.x went commercially licensed. Everything new in the order service —
   the customer-order projection, the expiry sweep — must be written against that API.
   .NET 8 goes EOL 2026-11-10, so this whole feature lands on a runtime with a clock on it.

3. **The saga stays small.** It covers inventory reservation only. Do not add a payment step
   or a payment timeout to `OrderStateMachine` — the expiry sweep in Phase 5 is a background
   service, not a saga transition.

4. **Abandonment is the central new hazard.** Checkout ("Fire to Kitchen") commits the order
   and reserves inventory; payment is a separate later call. Today the only thing that releases
   inventory is `POST /orders/{orderId}/cancel`, a manual staff action
   (`FinalOrderService.CancelAsync`). A public ordering page has no human backstop and
   abandonment is *normal*, so the sweep is required work, not a nice-to-have.

---

## Phase 0 — Auth and tenancy groundwork  ·  size: M  ·  blocks everything

### 0.1 Shared package: `Tenant.Domain` (do this first, it has the longest lead time)
Batch **both** entity changes into one version bump — this package is a NuGet round trip, so
splitting them doubles the wait for no benefit.

- `shared/tenant.domain/Entities/Location.cs` — add `Address` (string?),
  `DisplayDistanceMiles` (decimal?), `IsDiscoverable` (bool, default `false`),
  `EstimatedPickupMinutes` (int?).
  `IsDiscoverable` defaults **false** so no existing tenant becomes publicly listed by a migration.
- `shared/tenant.domain/Entities/Restaurant.cs` — add `Cuisine` (string?, `MaxLength(64)`).
  Nullable rather than required: existing tenants have no sensible value, and discovery should
  treat "no cuisine" as unfiltered rather than hiding the restaurant.
- Bump `<Version>` to `2.1.0` in the same commit. Push to `dev`, confirm the package
  actually appeared on the feed before continuing.
- In identity: bump the `PackageReference`, then
  `dotnet ef migrations add AddDiscoveryFields` against the tenant schema.

### 0.2 New OIDC client + scopes
In `services/identity/src/IdentityService/appsettings.json` → `IdentityServerSettings`:
- New `ApiScope`: `diner`.
- Add `diner` to the `Order` and `Payment` `ApiResources` scope lists (a diner needs to reach
  both), and to `Catalog` if you gate the public menu by scope rather than `[AllowAnonymous]`.
- New client `spoontab-diner`: grant type `password`, `RequireClientSecret: false`,
  `AllowedScopes: [openid, profile, roles, diner, order.read, order.write, payment.read]`,
  CORS origin `http://localhost:5173`.
  Password grant is a deliberate, documented exception for this one first-party client so the
  design's inline sign-in modal works. Staff keep Authorization Code + PKCE — do not touch the
  `frontend` client.

> Note the existing config still declares `catalog.inventory.read`/`catalog.inventory.write`
> scopes that no policy consumes any more (the inventory entity merge removed them). Leave
> them alone here; cleaning them up is separate work and would need a token-lifetime think.

### 0.3 Diner authorization policies
- `OrderPolicyExtensions.cs` — add `DinerWrite` = `ScopeRequirement("order.write")` **without**
  the `RequireRole` clause, and `DinerRead` similarly. Apply these to the new diner-facing
  routes only; leave the existing staff policies untouched on the existing routes.
- Ownership, not just scope: a diner holding `order.read` must not be able to read someone
  else's order. Every diner-facing read must additionally check
  `order.CustomerId == currentUser.Sub`. Put that check in the service layer
  (`FinalOrderService`), not the controller, so the projection path in Phase 5 shares it.
- `CurrentUserAccessor` already exists in the order service — confirm it exposes `sub`
  before relying on it.

### 0.4 Tenant-header discipline for anonymous traffic
Anonymous diner requests carry no JWT, so `lib/http.ts`'s claim-decoding fallback cannot fire
and `TenantMiddleware` will happily default to `acme-bistro`/`sjc-01`.
- Frontend: the diner area must set `x-restaurant-id`/`x-location-id` explicitly from the
  restaurant the user selected, via the existing `withTenantHeaders()` in
  `auth/tenantHeaders.ts` with an explicit tenant argument — never the implicit `getTenant()` path,
  which is hydrated from staff onboarding state and will be wrong or empty for a diner.
- Backend: on the anonymous endpoints, treat a missing/unknown tenant header as `400`, not as
  "use the default". Consider a small guard rather than trusting middleware defaults.

**Verify Phase 0:** `dotnet build Restaurant.Pos.sln` clean; obtain a token via the
password grant with `curl` against `/connect/token` and confirm it carries the `diner`
scope and no staff role.

---

## Phase 1 — Restaurant discovery  ·  size: S–M

### Backend (identity, `Features/Tenancy/`)
New `PublicDiscoveryController` (or a `[AllowAnonymous]` section on the existing tenancy
controller — prefer a separate controller so the anonymous surface is obvious in one file):

| Method | Route | Returns |
|---|---|---|
| `GET` | `/public/restaurants` | Discoverable restaurants + their discoverable locations; supports `q` (name/cuisine substring), `cuisine`, `sort` |
| `GET` | `/public/restaurants/{restaurantId}` | One restaurant + locations, for the menu view header |

This is one of the two deliberate cross-tenant exceptions. It's safe because `Restaurant` and
`Location` are **not** `ITenantEntity` rows — they *are* the tenant, so there is no query filter
to bypass and no `TenantEfRepository` involved. Query `TenantDbContext` directly. Filter on
`IsActive && IsDiscoverable`.

Cuisine comes from `Restaurant.Cuisine`, added in 0.1. It drives both the header filter and the
card badge. Treat a null cuisine as "matches any filter" rather than excluding the restaurant.

### Frontend
- `src/domain/discovery/` — new domain folder following the established
  `api.ts`/`types.ts`/`keys.ts`/`hooks.ts`/`index.ts` shape.
- `src/features/diner/` — new feature area. `DinerLayout` + `DiscoveryPage`.
- `src/app/router.tsx` — new lazily-loaded top-level `/order` branch, **outside**
  `ProtectedRoute`. Keep it a sibling of `/pos` and `/management`, not nested.
- Header/search/sort/grid per the handoff. Sorts: Recommended (source order),
  Distance (asc on `DisplayDistanceMiles`), Pickup (asc on `EstimatedPickupMinutes`).
  **Drop the Rating sort** — see Design deviations below.

**Verify:** discovery page lists seeded restaurants with no session; DevTools shows no
`Authorization` header on those calls.

---

## Phase 2 — Public menu + modifiers  ·  size: L

### Backend (catalog)
- New entities in `services/catalog/src/CatalogService/Entities/`:
  - `ModifierGroup` — `Id`, `MenuItemId`, `Name`, `SelectionType` (`Single`|`Multi`),
    `Required`, `DisplayOrder`, plus `RestaurantId`/`LocationId` (implement `ITenantEntity`;
    these are staff-managed rows and must stay tenant-scoped).
  - `ModifierOption` — `Id`, `ModifierGroupId`, `Name`, `PriceDelta`, `DisplayOrder`, `IsDefault`.
  - `MenuItem` itself is unchanged. Note `Entities/` currently holds exactly one file; the
    root `CLAUDE.md` says so explicitly — update that line when you add these.
- Migration on the catalog schema.
- `GET /public/menu?restaurantId=&locationId=` — anonymous, returns available items grouped by
  category with `modifierGroups[]` nested. Must filter `IsAvailable && Quantity > 0` and must
  not leak cost/stock internals.
- **No staff CRUD or management UI for modifiers in this phase** (decided 2026-08-03) — they are
  seeded by script instead. See 2.1. This is the single biggest scope cut in the plan; it keeps
  Phase 2 to the diner-facing read path plus the entities themselves.
  **Superseded 2026-08-05 — see Phase 7.** The cut was revisited on request; staff CRUD, the
  `MenuItemModifiersChanged` event, and order's projection-backed price resolution all shipped.

### 2.1 Seeding modifiers
Extend the demo seed script (see Phase 6 — build it here rather than there, since Phase 2 has no
other data path and cannot be tested without it). Reuse the pattern in
`services/frontend/e2e/fixtures/oidc.ts` + `seed.ts`, which already mints an API-scoped token
outside the browser by driving `/connect/authorize` (`prompt=none`) + `/connect/token` directly —
that is the hard part of seeding through the real API rather than raw SQL, and it is already solved.

Seed at least one item per modifier shape the design exercises so the UI is fully coverable:
a single-select group (size, spice level), a multi-select group (extras), and a required group.

Consequence to accept knowingly: **restaurant staff cannot create or edit modifiers at all**
until an authoring UI is built. Modifier data exists only where the script put it. Do not
demo modifier editing, and do not let the management Menu tab imply it is editable.
**No longer true as of Phase 7** — the management Menu tab has a real "Modifiers" action now.

### Frontend
- Extend `src/domain/menu/` with the public menu hook + modifier types.
- `MenuPage` (diner), category sections, item rows, `Add` vs `Customize` branching.
- `ItemModifierModal` — single/multi select groups, price-delta math, special instructions,
  quantity stepper, live "Add to Order • $X.XX" total.
- Cart line identity is `menuItemId + exact selected option set + notes` — identical configs
  merge, different configs are separate lines. Get this key right once, in a helper, and reuse
  it for both the local cart and the server payload.

**Verify:** add a modifier group via the staff path, see it render in the diner modal, and
confirm the computed line total matches base + deltas × qty.

---

## Phase 3 — Diner cart and order placement  ·  size: M  ·  **DONE 2026-08-04**

### What actually shipped, where it diverged from the plan below

- **The route is `POST /diner/checkout`, not `POST /carts/{id}/diner-checkout`.** The diner cart
  lives in localStorage until checkout (Phase 2 built it that way), so there is no incremental
  server cart to check out by id. One call now creates the cart, prices it, and fires it. The
  client-generated `cartId` in the body is the idempotency key — replaying it returns the
  original order rather than 409-ing, and a cart id belonging to another diner 404s.
- **`POST /diner/quote` was added and is not in the plan.** Without it the checkout screen could
  only show an item subtotal, so the diner would commit to a total they had never seen. It runs
  the same resolve-and-price path as checkout but persists nothing.
- **Modifier prices are resolved over HTTP from catalog's `/public/menu`, not from a
  projection.** This is the one synchronous cross-service call in the platform, and it exists
  because of a hole in the plan: the order service has no modifier data at all (`PosCatalogItem`
  projects name/price/stock only), and a client-supplied `priceDelta` can be negative. A
  projection is the house style but cannot be backfilled, because modifiers are seeded by raw
  SQL and fire no events. Revisit when modifiers get an authoring UI that publishes events.
  **Done — see Phase 7.** `PosCatalogItem` now carries a `Modifiers` projection fed by
  `MenuItemModifiersChanged`, and this synchronous call is gone.
- **The seed script now also writes `order."PosCatalogItems"`.** Seeded menu items fired no
  `MenuItemCreated` events, so the POS read model never learned about them — the diner menu
  rendered and then every checkout failed with "Menu item not found in catalog". This affected
  the staff POS equally.
- **`Order.CustomerId` was never populated by any path** — `FinalizeOrderMappings` dropped it.
  Fixed; it is now the boundary between one diner's orders and another's.
- **Diner self-signup (`POST /public/diner/register` in identity) was added.** ROPC signs a diner
  in but cannot create the account, and the only registration surface was a staff Razor page.
  Partly hardened 2026-08-05 — see "Deferred hardening" below.

### Backend (order)
- `CartItem`/`OrderItem` gain `SelectedModifiers` — a snapshotted list of
  `{ groupName, optionName, priceDelta }`, following the existing snapshot pattern already used
  for `MenuItemName`/`UnitPrice` (`Entities/Cart.cs:23`, `Entities/Order.cs:66`). Store as JSON
  columns; these are owned collections, not relationships to catalog.
- `Cart`/`Order` gain `OrderType` (`DineIn`|`Pickup`) and `PickupTime` (`DateTimeOffset?`).
  Derive nothing from `TableId == null` going forward — make the type explicit — but keep
  `PricingContext(DineIn: ...)` behaviour identical for existing dine-in orders so POS pricing
  does not shift.
- **Unit price must include modifier deltas** before it reaches `PricingService`, or tax will be
  computed on the wrong subtotal. Decide where that folding happens (recommendation: in
  `CartService` when the line is added, so the stored `UnitPrice` is already all-in) and comment it.
- New diner routes on `CartController`/`OrderController` under the Phase 0 diner policies, with
  `CustomerId` stamped from the token — never from the request body.
- Migration on the order schema (`OrderDbContextFactory`, not the saga context).

### 3.1 Combined diner checkout (decided 2026-08-03)
Staff keep the deliberate two-step flow — fire now, pay later — because a table order
legitimately sits unpaid. Diners get **one call** that commits the order and routes it straight
to payment:

```
POST /carts/{id}/diner-checkout      [Authorize(Policy = DinerWrite)]
  → CartService.CheckoutAsync(id)    // existing path: creates Order, publishes OrderSubmitted
  → returns { orderId }              // frontend then polls for the client secret as it does today
```

New method on `IOrderService` (e.g. `CheckoutAndRequestPaymentAsync`) so the sequencing lives in
`FinalOrderService` next to `FinalizeOrderAsync`, not in the controller. The existing
`POST /carts/{id}/checkout` and `POST /orders/{id}/request-payment` stay exactly as they are.

**Do not publish `PaymentRequested` inline in that method.** Right after checkout the order is
`Pending` — the saga hasn't resolved inventory yet — so an inline publish creates a Stripe
PaymentIntent for an order that may be `Rejected` moments later when
`InventoryReserveFaulted` lands. `OrderController.RequestPayment` only guards against `Paid`
and `Rejected` (`Controllers/OrderController.cs:66-67`); neither is true yet at that instant,
so the guard does not save us. Nothing in the payment service can cancel a PaymentIntent today,
so the orphan would just sit there.

Instead, add an **`InventoryReservedConsumer`** in `services/order/src/OrderService/Consumers/`
that publishes `PaymentRequested` when the order it resolves is a diner/pickup order:

- It is the exact existing pattern — `Consumers/` already applies outcomes independently of
  saga transitions (`InventoryReserveFaultedConsumer` is its sibling), so this needs no change
  to `OrderStateMachine` and keeps the small-saga rule intact.
- Payment is only ever requested for stock that is actually reserved. The rejection path
  needs no compensation because no PaymentIntent was ever created.
- It costs nothing in UX: the frontend already polls for the client secret, and the saga round
  trip is local RabbitMQ.
- Gate it on `OrderType == Pickup` so POS orders are untouched and staff keep manual control.

Net effect: from the frontend's side it is one call, and every diner order is routed to payment
automatically — which is the intent — without the race.

### Frontend
- `src/features/diner/` cart sheet + checkout modal per the handoff.
- Cart is per-restaurant. `Cart.RestaurantId`/`LocationId` already enforce this for free via
  tenant stamping — no new validation needed. Switching restaurants mid-cart must **prompt
  before clearing**, not silently discard.

**Verify:** place a pickup order as a diner account end to end; confirm the row lands with
`TableId = null`, `OrderType = Pickup`, correct `CustomerId`, and a grand total matching the
UI estimate.

---

## Phase 4 — Payment  ·  size: S  ·  **DONE 2026-08-04**

### What actually shipped, where it diverged from the plan below

- **The ownership fix needed a contract change, not just a check.** The payment service holds no
  order data, so it had nothing to compare a caller against. `PaymentRequested` gained an optional
  `CustomerId` (Messaging.Contracts **1.0.7**), `Payment` gained the column, and both publishers
  (`InventoryReservedConsumer`, `OrderController.RequestPayment`) now carry it.
- **Denial is indistinguishable from not-found.** A diner asking for someone else's payment gets
  the byte-identical 404 an unknown order id gets. Verified both directions.
- **The check keys off the `diner` scope, not a role.** A token without it passes through
  untouched, so staff behaviour is unchanged; `PaymentPolicyExtensions.Read` has no role
  requirement, so scope is the only thing that distinguishes the two callers.
- **`StripeCheckoutDialog` gained an optional `confirm` prop.** It defaulted to the staff call,
  which mints a scoped token from the POS session — a diner has no such session. Default
  preserved, so the POS path is untouched.
- **Order status page polls until the order settles**, not just while Pending: `Pending →
  Confirmed` (saga) and `Confirmed → Paid` (payment consumer) are two separate waits, and one
  poll covers both. An unpaid order polls indefinitely while the tab is open — 5.1's sweep is
  what ends that.
- **Pre-existing payments have a null `CustomerId`** and are now unreachable by diners. Only
  affects rows written before this migration; a real deploy with live diner orders would need a
  backfill from `order."Orders"`.

**MERGE GATE:** order and payment both consume Messaging.Contracts as a temporary
`ProjectReference` (TODO comments in both `.csproj`s). Flip to `PackageReference` 1.0.7 at merge,
after confirming 1.0.7 is actually on the feed.

---

Everything downstream of `PaymentRequested` is reused unchanged: `PaymentRequestedConsumer`
creates a Stripe PaymentIntent → frontend polls `GET /orders/{id}/payment-session` and confirms
via the embedded `PaymentElement` → `POST /orders/{id}/payment-confirm`. The only difference for
diners is what publishes `PaymentRequested` — the new `InventoryReservedConsumer` from 3.1
rather than an explicit staff call.

Both payment endpoints are served by the **payment** service despite the `/orders/...` path
(`services/payment/PaymentService/Controllers/PaymentSessionController.cs:14`) — the SPA calls
payment directly. Both are gated by `PaymentPolicyExtensions.Read`, so the `diner` scope must
satisfy that policy (Phase 0.2) *and* the ownership check must apply here too, or a diner could
fetch another customer's client secret. **Treat that as a security-blocking item for this phase.**

Frontend: reuse `StripeCheckoutDialog` rather than the handoff's mock card fields.

**Verify:** pay a diner order with a Stripe test card; confirm `PaymentSucceeded` lands and
`Order.PaidAt` is set.

---

## Phase 5 — Abandonment sweep, order history, notifications  ·  size: M–L

### 5.1 Expiry sweep (do this before shipping anything publicly) · **DONE 2026-08-04**

**What actually shipped, and where it diverged from the plan below.**

- **TTL is 5 minutes, dine-in exempt** (decided 2026-08-04 — it's a demo project, so the short
  window makes the behaviour visible). Config lives at `AbandonedOrders` in the order service's
  `appsettings.json`: `Enabled`, `Ttl`, `Interval` (1 min). Real expiry granularity is
  `Ttl + Interval`.
- **The tenant trap resolved as "set the holder per iteration", not "bypass the repository".**
  `TenantContextHolder` is an AsyncLocal a background service can set for itself, and everything
  downstream — the repository filter, EF's per-tenant model cache, the headers `TenantBusFilter`
  stamps on `ReleaseInventory` — then reads it. It has to be set *before* the DI scope is
  created, since that is when `ITenantContext` is resolved. Only the candidate query steps
  outside: it is inherently cross-tenant, so it builds an `OrderDbContext` by hand with a
  `__sweep__` sentinel tenant and `IgnoreQueryFilters()`.
- **An extra guard the plan didn't anticipate, and the real subtlety here.** The `Order` entity
  has no `Confirmed` status — only the saga does — so an order sits at `Pending` both before and
  after inventory is reserved, and age alone cannot distinguish "diner walked away" from
  "`OrderSubmitted` never reached the broker". Cancelling the second kind publishes a
  `ReleaseInventory` for stock that was never taken, silently inflating the count. So the sweep
  joins `OrderState` (cross-tenant by nature — `OrderStateDbContext` has no tenant filter) and
  only cancels orders whose saga reached `Confirmed`. Stranded orders are logged as warnings
  every tick and left for an operator: a broker outage is a fault to look at, not something a
  timer should paper over. Verified both ways.
- **Diner cancel shipped as `POST /diner/orders/{id}/cancel`**, behind `DinerWrite`, reusing
  `GetMyOrderAsync`'s ownership check so another diner's order 404s exactly as it does on the
  read path. Frontend: a ghost "Cancel order" button under Pay on `OrderStatusPage`.
- **Unrelated copy fix found while testing.** `OrderStatusPage`'s header keyed off
  `status === "Pending"`, which is true for the whole life of an unpaid order, so "Ready to pay"
  never rendered. Now keyed off the payment session's `clientSecret`, which is the thing that
  actually changes.

Verified live: fires 40 → 37 stock, sweep cancels at TTL and returns it to 40, `OrderCancelled`
notification raised, dine-in and paid orders untouched; four genuinely abandoned orders left over
from Phase 4 testing were swept on first run. Diner cancel checked for 204 / 204-idempotent /
409-when-paid / 404-for-someone-else, plus the button in the browser.

---

*Original plan below.*

A `BackgroundService` in the order service that finds orders where
`Status == Pending && PaidAt == null && CreatedAt < now - TTL` and runs the existing
`CancelAsync` path (which publishes `ReleaseInventory` and raises the `OrderCancelled`
notification). Reuse `FinalOrderService.CancelAsync` — do not write a second cancel path.

The combined checkout in 3.1 narrows this window but does **not** close it — the diner can still
abandon the card form after the PaymentIntent exists. What it does buy us is a cleaner sweep
predicate: every committed diner order now has payment requested, so the sweep targets
"pickup order, `Pending`, unpaid, older than TTL" with no ambiguity about whether anyone ever
intended to pay.

Points to decide: TTL (15 min is a reasonable default for pickup), whether dine-in orders are
exempt (they should be — a POS table order legitimately sits unpaid for an hour), and how the
sweep scopes tenants given it runs outside a request and therefore outside `TenantMiddleware`'s
AsyncLocal context. **That last one is the real trap**: `TenantEfRepository` and the EF query
filters both read ambient tenant state. The sweep will need to either set the tenant context
per iteration or bypass the repository with a direct, explicitly-filtered `DbContext` query.
Check how `PosReadModelProjector` handles this (it uses raw SQL, partly for related reasons)
before choosing.

Also add a diner-facing cancel: a customer may cancel their **own unpaid** order. Same
`CancelAsync`, new policy, ownership check.

### 5.2 Cross-restaurant order history · **DONE 2026-08-04**

**What actually shipped, and where it diverged**

- **As planned:** `CustomerOrderSummary` is not `ITenantEntity`, has no `TenantEfRepository`
  registration, and is written through `OrderDbContext` directly from the order lifecycle, with
  the deliberate absence of a tenant stamp spelled out on the entity and the service.
- **Written from four places, not three.** The plan named `FinalizeOrderAsync`/`MarkPaidAsync`/
  `CancelAsync`. `Rejected` is the fourth: `InventoryReserveFaultedConsumer` sets it directly on
  the entity and never goes through `FinalOrderService`, so without a write there a diner whose
  order failed on stock would see it sitting at `Pending` in their history for good.
- **Restaurant names are snapshotted, which the plan didn't cover.** History spans restaurants,
  and a row that says `sjc-01` is no use to the person reading it. Identity owns those names and
  this service has no projection of them, so `TenantDirectoryClient` reads
  `public/restaurants/{r}/locations/{l}` once per row, cached an hour, best-effort — a display
  name must never fail an order. Snapshot rather than join, because a restaurant that leaves
  discovery would otherwise erase its own name from old receipts.
- **`GET /diner/history` ignores tenant headers**, which is the whole point; `GET /diner/orders`
  stays tenant-scoped and untouched. The frontend sends no tenant headers on this one call.
- **Frontend:** `/order/orders` (`OrderHistoryPage`), reachable from a "Your orders" button in
  the discovery header when signed in. Opening a row calls `rememberDinerTenant` for that row's
  restaurant first — every single-order read is tenant-scoped, and the remembered tenant is
  whichever restaurant the diner last ordered from, so without it a row from restaurant B 404s
  on a page the diner is looking straight at.

Verified live: history empty → one row → two rows across two restaurants; identical answer with
correct, bogus and absent tenant headers, against a tenant-scoped `/diner/orders` returning `[]`
for the same bogus tenant; diner2 sees none of diner1's rows; `Cancelled` via diner cancel and
via the 5.1 sweep, and `Paid` both land on the row. The `Paid` check published `PaymentSucceeded`
onto the broker by hand rather than paying through Stripe — same consumer path, Stripe leg
skipped. Browser: all three statuses render, and opening a row from the *other* restaurant loads
its status page correctly.

---

*Original plan below.*

`CustomerOrderSummary` — deliberately **not** `ITenantEntity`, so it is queryable by
`CustomerId` across restaurants. Second of the two cross-tenant exceptions.

**Decided 2026-08-03: direct write, superseding ADR-001's event-driven projector.** Both producer
and consumer would have been the order service itself, so the event hop bought nothing. Write the
summary row inline in `FinalOrderService` — in `FinalizeOrderAsync` (create), `MarkPaidAsync`
(status → Paid), and `CancelAsync` (status → Cancelled), in the same unit of work as the `Order`
mutation it mirrors.

This also avoids two costs the event route carried: adding `CustomerId` to `OrderSubmitted`
(`shared/messaging.contracts/Events/Order/Contracts.cs:3` — a shared-package round trip plus a
compatibility think for the saga, which consumes that same event), and inventing an
`OrderCancelled` event contract nothing else needs.

Note this table is **not** tenant-scoped, so it does not go through `TenantEfRepository` — write
it via `OrderDbContext` directly and be explicit that omitting the tenant stamp is intentional,
or the next person will "fix" it. Leave a comment saying so.

### 5.3 Notifications · **DONE 2026-08-04**

**What actually shipped, and where it diverged.**

A whole second table, `CustomerNotification`, rather than customer-addressed *types* on the
existing one. The plan's phrasing implied extending `NotificationType`; that turns out to be the
wrong shape twice over. `Notification` is `ITenantEntity` and a diner's notifications span
restaurants — the same problem 5.2 solved with its own table — and folding the two audiences
together would give every existing staff query an invisible "and not addressed to a customer"
clause it can only get wrong. Two tables, two type constant sets, no overlap.

"Your pickup is ready" **is not among the types**, because there is no ready signal in the
system: `Order.Status` is only Pending/Paid/Rejected/Cancelled and nothing marks an order as
prepared. Adding one is a POS/kitchen feature, not a notification feature. The five types shipped
are the ones backed by events that actually happen: `OrderConfirmed` (inventory reserved),
`OrderRejected`, `OrderPaid`, `PaymentFailed`, `OrderCancelled`.

`IOrderService.CancelAsync` grew a `reason` parameter. Without it the sweep's cancellation and
the diner's own read identically, and "your order was cancelled" with no "because it went unpaid"
looks like the restaurant turned them down. The sweep, the diner cancel and the table-clear each
pass their own sentence.

Delivery is polling only. Staff notifications also push over the SignalR floor hub, but that
broadcasts to a per-tenant group; putting a diner in one would hand them every table event the
restaurant produces.

**Verified** against the running stack: all five types observed end to end, tenant-independence
confirmed (correct, bogus and absent tenant headers return the same rows), diner2 sees none of
diner1's, and mark-read is a silent no-op across customers rather than a 404 that would confirm
an id exists. Two paths were driven by hand-publishing their event onto RabbitMQ rather than
through their real producer — `OrderPaid` (Stripe leg skipped, as in 5.2) and `OrderRejected`
(the cart's own stock guard 400s an over-quantity order before checkout, so a genuine
reservation fault needs a race). Both went through the real consumer.

One bug caught in verification: the paid message interpolated `{GrandTotal:C}`, which renders in
the *server host's* culture — it produced "NPR16.72" on this machine. Money formatting is the
frontend's job and the amount is now out of the string entirely.

*Original plan below.*

The order service's notification subsystem exists but every `NotificationType` is staff/table
facing (`TableSeated`, `OrderCancelled`, …). "Your pickup is ready" needs new customer-addressed
types plus a per-customer read path — not a drop-in reuse. Scope this last; the confirmation
screen (Phase 3/4) covers the minimum viable feedback loop without it.

---

## Open items cleared before Phase 6  ·  2026-08-05

Backlog items carried from Phases 1, 2 and 4, closed together against the running local stack.

### `GET /public/menu` now checks discoverability
It served any `restaurantId`/`locationId` pair, so a restaurant that had never opted into public
listing — or had deliberately opted out — still had a fully readable menu to anyone who knew its
ids, and the ids are in every discovery response. Catalog holds no copy of `IsDiscoverable`
(it belongs to identity's `Location`, and a projection would mean two sources of truth for who is
visible), so `LocationDirectoryClient` asks identity's own `public/restaurants/{r}/locations/{l}`
and 404s the menu when that 404s.

**It fails closed**, unlike order's `TenantDirectoryClient`: that one decorates a history row and
swallows errors, this one is a gate, so an unreachable identity is a 503 rather than an open door.
Answers cache for one minute — far under the directory client's hour, because the stale direction
that matters is a cached `true` outliving a takedown.

*Verified:* listed → 200; unlisted, unknown restaurant, unknown location → 404 (identity gives one
404 for all three, and so does this); missing params → 400; identity stopped → 503 with no menu
body. Both cache edges observed: an unlisted location kept serving for up to a minute, and a
relisted one stayed 404 for up to a minute.

### Discovery admin endpoints verified
Done with real staff tokens minted through the full Razor-login + PKCE flow (`scratchpad/stafftok.py`),
against a throwaway restaurant, by two throwaway accounts — one its admin, one not.

| Case | Result |
|---|---|
| admin sets cuisine / lists location | 204, and the listing appears in `public/restaurants` |
| non-admin, either endpoint | 403 |
| anonymous, either endpoint | 401 |
| unknown location, or another restaurant's location | 404 |
| `cuisine` >64 chars, `estimatedPickupMinutes` 9999 | 400 |
| **`IsDiscoverable=true` on an inactive location** | **400** — the guard works |
| unknown restaurant id | **403, not 404** — `IsTenantAdminAsync` runs first and can't distinguish "not yours" from "not there". Correct for a tenant-scoped API; it means `TenantsController`'s `catch (KeyNotFoundException)` on that action is unreachable. |

**Bug found and fixed while verifying:** the inactive-location guard only held in one direction.
`UpdateLocationAsync` deactivated a location without touching `IsDiscoverable`, leaving it `true`
but invisible (discovery needs both flags) — and flipping `IsActive` back on months later
silently republished the restaurant to the marketplace with nobody deciding to. Deactivating now
clears the listing; relisting is an explicit act again. *Verified:* deactivate leaves `f|f`,
reactivate leaves `t|f` and a 404 public listing until the location is explicitly relisted.

### Diner registration is rate limited
5 registrations per client address per 15 minutes, fixed window, `429` + `Retry-After` past that,
nothing queued. Scoped to this one endpoint — it is the only anonymous endpoint that *writes*.

This needed a second fix to mean anything. `ForwardedHeadersOptions` cleared both `KnownProxies`
and `KnownIPNetworks`, i.e. trusted `X-Forwarded-For` from **anyone**, so a caller could pick
their own apparent IP per request and never see the limit. It now honours the framework default
(loopback only) unless `ForwardedHeaders:KnownNetworks` names the ingress network — safe by
default, and a deployment must opt in.

> **Deployment note:** until `ForwardedHeaders:KnownNetworks` is set to the AKS pod CIDR,
> `RemoteIpAddress` behind Emissary is the proxy's, which makes the limit effectively global
> rather than per-client. That is the safe way round to be wrong, but it is a real behaviour
> change from the previous config — client IPs in logs change too.

*Verified:* 5×204 then 429 with `retry-after: 900`; discovery reads unaffected. The spoofing
half was proven by declaring a `KnownNetworks` that excludes loopback and confirming three
different forged `X-Forwarded-For` values all stayed 429. (With the default config, loopback
*is* a legitimate trusted proxy, so a localhost spoof is honoured by design — the test only
means anything from a non-trusted source.)

### Deferred hardening
Registration still has **no CAPTCHA** and **no email verification**, so a distributed flood is
unaffected and anyone can sign up as an address they don't own. Both need infrastructure this
platform doesn't have (a CAPTCHA provider, an outbound mailer). Still blocking a genuinely
public deployment.

### `Messaging.Contracts` merge gate — **CLOSED 2026-08-05**
Was blocked by construction — `publish-messaging-contracts.yml` only fires on a push to
`dev`/`main`, so the version couldn't be confirmed on the feed until something actually merged.
Closed via the recommended sequence below, widened to also cover Phase 7's 1.0.8 bump (the gate
was still open when Phase 7 started, so its `MenuItemModifiersChanged` addition rode the same
PR rather than opening a second one):

1. `dev` merged into `diner-ordering` (picked up `726ac9f`, the `Tenant.Domain` discovery-fields
   commit) — clean merge, no conflicts.
2. [PR #25](https://github.com/basnets24/restaurant.pos/pull/25) opened against `dev`, containing
   only `shared/Messaging.Contracts/` (the `PaymentRequested.CustomerId` addition from Phase 4
   plus `MenuItemModifiersChanged` from Phase 7, both already additive/non-breaking) — merged.
3. `publish-messaging-contracts.yml` ran on the merge and succeeded; confirmed via the version
   index (not `dotnet package search`) that **1.0.8** is on the feed.
4. All three csprojs (`order`, `payment`, `catalog`) flipped from `ProjectReference` back to
   `PackageReference Version="1.0.8"`. Required a local NuGet cache clear
   (`rm -rf ~/.nuget/packages/messaging.contracts/1.0.8`) and a clean `obj/`/`bin/` on `order`
   (a stale `.nuget.g.props` from the `ProjectReference` era collided on restore) before
   `dotnet restore`/`build` picked up the real package. Solution builds clean.

> **Check the feed with the version index, not `dotnet package search`.** That command reported
> 1.0.4 as newest while 1.0.6 had been published for ten months — GitHub's NuGet *search* index
> lags arbitrarily behind the *registration* index that restore actually uses. Use:
> `curl -u <user>:$GH_PAT https://nuget.pkg.github.com/basnets24/messaging.contracts/index.json`

*(The sequence actually followed, once 1.0.8 was in the picture too, is the numbered list above —
this originally previewed 1.0.7 only, before the gate closed.)*

---

## Phase 6 — Polish and tests  ·  size: S–M  ·  **DONE 2026-08-05**

### What actually shipped, where it diverged from the plan below

- **The seed script and the frontend doc update were already done** by the time this phase
  started — `scripts/seed-discovery.sh` (demo restaurants, cuisines, distances, pickup
  estimates, menu + modifiers) and `services/frontend/CLAUDE.md`'s diner-surface documentation
  both landed earlier, alongside the phases that needed them, rather than being deferred here.
  Only the doc updates and the Playwright spec were actually outstanding.
- **Doc updates covered more than the two false claims.** Root `CLAUDE.md` got a new "Diner
  ordering" architecture section (discovery is cross-tenant by design, a diner is not staff,
  checkout is one call, abandonment needs a sweep, history/notifications are the other two
  cross-tenant exceptions, modifiers have no authoring UI) alongside fixing the "one entity"/
  "one file" claims. `catalog/README.md`, `order/README.md` and `identity/README.md` each grew
  a section for their half of the diner surface (`GET /public/menu` + the discoverability gate;
  the `/diner/*` routes and the sweep; `/public/*` discovery + registration + the discovery-admin
  routes) — the plan only mentioned the two false claims, not that three READMEs had no diner
  content in them at all.
- **The E2E fixture had to work around two things the plan didn't anticipate.** There is no
  staff API for modifier groups at all (a deliberate Phase 2 scope cut), so
  `e2e/fixtures/dinerMenu.ts` seeds its one modifier group via a direct `psql` call — the only
  option besides adding a test-only admin endpoint, which would have been new production surface
  for no reason. And the E2E tenant turned out to already carry `seed-discovery.sh`'s full demo
  menu from earlier manual runs (nothing unlists or deletes it), so the spec had to scope its
  "Customize" locator to its own seeded item's row rather than assume it's the only one on the
  page — see the comment in `diner-ordering.spec.ts`.
- **The default 30s Playwright test timeout wasn't enough.** This flow has several more steps
  before it reaches the Stripe dialog than `payment.spec.ts`'s does; `test.setTimeout(60000)`
  fixed it.
- **A throwaway diner account is created via a direct API call**, not by driving
  `DinerAuthDialog`'s register form — partly so the one browser-driven auth step in the spec
  exercises sign-in specifically, partly to stay well under `DinerRegistration`'s 5-per-15-minute
  rate limit (Phase 16 open-items work) across repeated local runs.

Verified live: the full spec (discovery search → menu → required-modifier dialog → cart →
inline sign-in → server-priced quote → place order → poll to a payable state → Stripe test card
→ "Paid — see you soon") passes end to end, alongside the existing `auth`/`pos-ordering`/
`payment` specs (all 4 green together). Seeded-item cleanup confirmed (`cleanupDinerMenu` leaves
no `E2E Diner Item *` rows behind); the shared E2E tenant's pre-existing demo listing/menu is
deliberately left alone.

**Not covered by this phase, and still open:**
- Visual confirmation that `DinerNotificationBell` renders correctly in a browser — it exists
  and is wired up, but nothing has actually looked at it rendered.
- ~~Merge gate #17 (`Messaging.Contracts` 1.0.7)~~ — closed 2026-08-05 as part of the wider
  1.0.8 gate closure; see Phase 7.

---

*Original plan below.*

- Playwright spec for the diner flow: discovery → menu → modifier → cart → sign-in → pay.
  Follow the existing `e2e/` patterns; note the Stripe Payment Element gotchas already
  documented in `services/frontend/CLAUDE.md` (collapsed accordion, duplicate iframe titles,
  viewport height) — they will bite here identically.
- Finish the seed script started in 2.1: demo restaurants with `IsDiscoverable = true`,
  `Cuisine`, addresses, distances and pickup estimates, so the discovery grid has enough variety
  to exercise search, the cuisine filter and all three sorts. The modifier half already exists
  from Phase 2.
- Doc updates: root `CLAUDE.md` (the "one entity — `MenuItem`" and "`Entities/` contains
  exactly one file" claims both become false), `services/catalog/README.md`,
  `services/order/README.md`, `services/identity/README.md`, `services/frontend/CLAUDE.md`
  (new `domain/discovery`, new `features/diner`).

---

## Phase 7 — Modifier authoring UI  ·  size: M  ·  **DONE 2026-08-05**

Not in the original plan — added after Phase 6, reversing the Phase 2 / 2026-08-03 decision to
leave modifiers script-seeded with no staff UI. Scoped deliberately minimal at first (staff CRUD
only, no events), then widened on request to also close the "revisit when modifiers get an
authoring UI that publishes events" note `CatalogMenuClient`'s doc comment had been carrying
since Phase 3.

### Messaging.Contracts (`Events/Menu/Contracts.cs`, **1.0.8**)
One coarse event rather than five granular ones, mirroring how `MenuItemUpdated` already carries
full current state instead of a delta: `MenuItemModifiersChanged(MenuItemId, RestaurantId,
LocationId, Groups)`, where `Groups` is the item's **complete current** modifier-group set
(`ModifierGroupSnapshot`/`ModifierOptionSnapshot`), never a partial update. A consumer never has
to diff or reason about arrival order — an empty `Groups` list just means the last group was
deleted. Batched into the version bump that was already pending for Phase 4's
`PaymentRequested.CustomerId` (1.0.7 → 1.0.8) rather than opening a second NuGet round trip.

### Catalog
- New `Features/Modifiers/ModifierGroupService` + `Controllers/ModifierGroupsController` — 4
  endpoints (`GET`/`POST` under `/menu-items/{id}/modifier-groups`, `PUT`/`DELETE` under
  `/modifier-groups/{id}`), reusing the existing `menu.read`/`menu.write` policies (no new scope).
  Goes straight at `CatalogDbContext` rather than the generic `IRepository<T>` — same reason
  `PublicMenuService` does: the repository has no `Include` support and no way to diff a nested
  `Options` collection on save. `PUT` diffs submitted options by id: present-with-id updates in
  place, no-id inserts, missing-id deletes.
- `DisplayOrder` is not exposed on the API — it's just array position on save. Cut deliberately;
  a reorder UI would be real scope for no benefit at 2–6 options per group.
- After every write, republishes the item's full current modifier set as
  `MenuItemModifiersChanged`.
- Catalog was still on `Messaging.Contracts` **1.0.4** (`PackageReference`) — never bumped past
  it because nothing it published had needed the later versions. Flipped to `ProjectReference`
  (`TODO(modifier-authoring)`, same pattern order/payment already carry for 1.0.7) rather than
  waiting on a `dev` push; folds into the same still-open merge gate from Phase 4/6, not a new one.

### Order
- `PosCatalogItem` (`Projections/PosReadModelProjector.cs`) gains `Modifiers`
  (`List<PosModifierGroup>`, jsonb via `JsonConverters.ListConverter`) — deliberately re-declared
  rather than reusing `Messaging.Contracts`' snapshot types, the same reason `CatalogMenuClient`
  re-declares catalog's public-menu DTOs: this is the read model's own on-disk shape, not the wire
  event. Migration `AddPosCatalogItemModifiers` on `OrderDbContext` (not the saga context), column
  defaults to `'[]'::jsonb` so `UpsertMenuSide`/`UpsertInventorySide`'s existing raw-SQL upserts
  (which don't list this column) never leave it `NULL`.
- Projector gains `IConsumer<MenuItemModifiersChanged>`, folding into `Modifiers` via the same
  `INSERT ... ON CONFLICT DO UPDATE` placeholder-row pattern `UpsertInventorySide` already uses,
  for the case where this arrives before `MenuItemCreated`.
- `CatalogMenuClient`/`ICatalogMenuClient` swapped from a synchronous HTTP call to catalog's
  `/public/menu` onto a read via `IRepository<PosCatalogItem>`. Signature changed from "give me
  the whole tenant menu" to "give me modifiers for these specific menu item ids" — tighter, and
  tenant scoping now comes free from `PosCatalogItem`'s EF query filter instead of explicit
  `restaurantId`/`locationId` arguments. `DinerOrderService`'s two call sites
  (`CheckoutAsync`/`QuoteAsync`) updated to pass the cart's item ids instead of the tenant.
  `CatalogSettings` (the now-dead `HttpClient` base-URL config) deleted entirely — class,
  `Program.cs` registration, and the `appsettings.json` section.
- Net effect: diner checkout/quote no longer has a cross-service call at request time, and the
  "menu is temporarily unavailable" failure mode (catalog unreachable → checkout blocked) is gone
  — a catalog outage no longer affects placing an order for menu data order already has cached.

### Frontend
- `domain/menu/` extended with modifier group types/API/service/hooks — no new domain folder.
- New `features/management/components/ModifiersDialog.tsx`: a "Modifiers" button added next to
  Edit on each `MenuCard` row (gated on the existing `canWrite`), opening a dialog that lists a
  menu item's groups and drops into an inline add/edit form (name, Single/Multi, Required, an
  options list with name/price-delta/default). One PUT (or POST for a new group) per save. No
  drag-reorder, no standalone options endpoints/UI — matches `DisplayOrder` being cut from the API.

Verified live against the running local stack, through the real staff UI (not just curl): logged
in as the seeded admin, opened Management → Menu → Modifiers on a seeded item with none yet,
added a required Single-choice "Spice level" group (Mild · default · $0, Spicy · +$0.50),
confirmed the row in `order."PosCatalogItems".Modifiers` matched exactly — proving the
catalog → event → projector path, not just the catalog write. Edited the group's name (options
preserved by id, not recreated) and deleted it, confirming the projection went back to `[]` and
the delete cascaded in catalog's own tables.

**Not done as part of this phase, closed shortly after (2026-08-05):**
- ~~Not pushed to `dev`/`main`~~ — see the merge gate closure above; all three services are back
  on `PackageReference Version="1.0.8"`.
- ~~Nothing committed yet~~ — five commits landed on `diner-ordering`, then pushed.

**Still not done:**
- The E2E fixture (`e2e/fixtures/dinerMenu.ts`) still seeds its modifier group via raw `psql`
  rather than the new API — simpler for a fixture than driving the management UI or minting a
  second staff token, not a gap in the API itself. Left as-is.
- No Playwright coverage for the staff modifier CRUD flow itself (create/edit/delete through the
  Menu tab) — verified by hand in the browser during this phase, not automated.

---

## Decided

- **`CustomerOrderSummary` is a direct write**, not an event-driven projector (2026-08-03).
  Supersedes ADR-001 on this point. See 5.2.
- **Diners get a single combined checkout call** that routes straight to payment; staff keep the
  two-step fire-then-pay flow. Diner authorization is a separate policy from the staff one.
  See 3.1. Implementation caveat: the actual `PaymentRequested` publish moves to a new
  `InventoryReservedConsumer` rather than going inline, to avoid creating a Stripe PaymentIntent
  for an order the saga is about to reject.

- **Modifiers are seeded by script; no authoring UI in this project** (2026-08-03). Staff cannot
  create or edit modifiers until that UI is built later. See 2.1.
  **Reversed 2026-08-05** — staff authoring UI shipped, event-published, projection-backed. See
  Phase 7.
- **`Restaurant.Cuisine` is added**, batched into the same 0.1 package bump as the `Location`
  fields (2026-08-03).

## Open decisions needing your call

1. ~~**Sweep TTL and dine-in exemption**~~ — settled 2026-08-04: **5 minutes, dine-in exempt.**
   Short because this is a demo project and the behaviour should be observable. See 5.1.

## Deliberate deviations from the design handoff

| Handoff shows | We ship | Why |
|---|---|---|
| Star ratings on cards, "Rating: Highest" sort | No ratings, sort dropped | No review entity exists anywhere in the platform; ADR-001 chose not to fake one |
| Restaurant/banner images | Text-forward cards | No image storage exists; consistent with the POS menu decision to skip fake photo slots |
| Real distance to the diner | Seeded `DisplayDistanceMiles` | No geolocation, no lat/lng, no haversine — restaurants are seeded demo data |
| Mock card number / MM-YY / CVV fields | Real Stripe `PaymentElement` | Reuse the working PaymentIntent flow |
| Mock "any email+password works" auth | Real password-grant OIDC against Duende | Real accounts, real tokens |

## Suggested execution order

Phase 0 → 1 → 2 → 3 → 4 → 5.1 → 5.2 → 5.3 → 6.

5.1 is listed after 4 but is a **release gate**, not an optional follow-on: do not expose the
diner surface publicly until the sweep exists, or abandoned carts will silently eat inventory
with no operator aware of it.
