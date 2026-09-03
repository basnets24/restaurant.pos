# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Cloud-native, multi-tenant restaurant POS platform: .NET microservices + a React frontend, deployed to a single VM (Docker Compose + Caddy). Event-driven (MassTransit + RabbitMQ, locally and in prod), CQRS-ish read models, PostgreSQL everywhere (schema-per-service).

## Commands

### Local dev (all services + frontend)
```bash
cp .env.example .env   # first time only — fill in GH_PAT, POSTGRES_PASSWORD, IdentitySettings__AdminUserPassword, Stripe test keys
./local/dev.sh        # starts infra (postgres/rabbitmq/seq) via docker compose, then all 4 .NET services + frontend
./local/dev.sh stop   # stops the services this script started; infra containers keep running
```
Only infra is containerized locally — each backend service runs directly via `dotnet run`, the frontend via `npm run dev`. `local/dev.sh` loads `.env`, waits for infra to be healthy, trusts the local HTTPS dev cert automatically.

- Frontend: http://localhost:5173
- Seq (logs): http://localhost:5341
- RabbitMQ management: http://localhost:15672
- Swagger per service: `<service-url>/swagger`

Jaeger/Prometheus/Grafana aren't part of local dev — prod only, demo purposes, see `deploy/README.md`.

### Backend (.NET — mixed TFMs)
**Target frameworks aren't uniform.** `net10.0`: catalog, identity, payment. `net8.0`: order (blocked — MassTransit 9.x went commercially licensed) and all three shared libraries. Check the `.csproj` before assuming a language/runtime feature is available; .NET 8 goes EOL 2026-11-10.

```bash
dotnet build Restaurant.Pos.sln                                    # build everything
dotnet build services/order/src/OrderService/OrderService.csproj   # build one service
dotnet test services/identity/tests/IdentityService.Tests          # only test project in the repo (xUnit + Moq)
dotnet test services/identity/tests/IdentityService.Tests --filter "FullyQualifiedName~SomeTestClass"
```
GitHub Packages restore needs `GH_PAT` (see NuGet.config) — same token `local/dev.sh` and CI use.

### Frontend (`services/frontend`)
```bash
npm run dev            # vite dev server
npm run build           # tsc -b && vite build
npm run lint            # eslint
```

### CI reality check
`.github/workflows/backend-ci.yml` and `frontend-ci.yml` are restore/build (backend) and build/docker-smoke-test (frontend) only — no lint, `dotnet test`, or E2E step runs in CI. Trust the workflow files over any prose description of the pipeline.

## Architecture

### Services (4, each an independent ASP.NET Core Web API + own Postgres schema)
| Service | Path | Ports (https/http) | Notes |
|---|---|---|---|
| identity | `services/identity/src/IdentityService` | 7163/5265 | Duende IdentityServer (OAuth2/OIDC). Absorbed the former `tenant` service — onboarding, location/membership management live under `Features/Tenancy/`. |
| catalog | `services/catalog/src/CatalogService` | 7226/5062 | Merged former `menu` + `inventory` services. Entities: `MenuItem` plus `ModifierGroup`/`ModifierOption`; publishes `MenuItemCreated/Updated/Deleted`, `MenuItemModifiersChanged`, `InventoryItem*`. Also serves the anonymous `GET /public/menu`. |
| order | `services/order/src/OrderService` | 7288/5236 | Cart, ordering, dining tables, pricing, notifications, SignalR floor hub. Owns the order saga and POS read-model projector. |
| payment | `services/payment/PaymentService` | 7182/5238 | Stripe **PaymentIntent** integration; decoupled from the saga. |

`services/frontend` (React 19 + TS, TanStack Query, Tailwind v4, oidc-client-ts) is the only non-.NET service, port 5173 in dev.

No `menu`, `inventory`, or `tenant` service directory exists — those names refer to features inside `catalog`/`identity`.

**Stock lives on the menu item.** `MenuItem.Quantity` — no `InventoryItem` entity, no `/inventory-items` endpoint. `InventoryItem*` in `Messaging.Contracts` are event names off menu-item stock changes, not a second entity. `PATCH /menu-items/{id}` → `MenuStockService`, `quantity` is **absolute, not a delta**; `IsAvailable` re-derives as `Quantity > 0` unless overridden. `ModifierGroup`/`ModifierOption` (single/multi-select add-ons) also live in `CatalogService/Entities/`, staff-managed via `ModifierGroupsController` — see Diner ordering.

### Order saga (`OrderService/StateMachines/OrderStateMachine.cs`, MassTransit)
Deliberately small — covers inventory reservation only, not payment:
1. `POST /carts/{id}/checkout` → `OrderSubmitted`. UI calls this **"Fire to Kitchen"**, not "Pay" — firing reserves inventory; paying is a separate later step. Checkout doesn't imply payment.
2. Saga → `ReserveInventory` → catalog's inventory consumer.
3. `InventoryReserved`/`InventoryReserveFaulted` → saga goes straight to `Confirmed`/`Rejected`. End of the saga's involvement — no `PaymentRequested`, no payment timeout. Both deliberate.
4. `OrderController.RequestPayment` publishes `PaymentRequested` directly, outside the saga. Payment's `PaymentRequestedConsumer` creates a Stripe **PaymentIntent**, publishes its client secret.
5. Frontend confirms client-side via an embedded Stripe `PaymentElement` (`StripeCheckoutDialog`) — no redirect to Stripe. Then `POST /orders/{orderId}/payment-confirm` server-verifies with Stripe and publishes `PaymentSucceeded`/`PaymentFailed` **synchronously — no webhook endpoint.**
6. `PaymentSucceeded`/`PaymentFailed`/`InventoryReserveFaulted` apply to `Order` via `Consumers/`, independent of saga transitions.

**Cancellation.** `POST /orders/{orderId}/cancel` voids an order, publishes `ReleaseInventory` (catalog applies it), raises `OrderCancelled`. The only publisher of `ReleaseInventory` — a manual operator action, not a saga timeout. An abandoned order still holds its inventory until someone cancels it.

### POS read model (`OrderService/Projections/PosReadModelProjector.cs`)
Consumes `MenuItemCreated/Updated/Deleted` + `InventoryItemUpdated/Depleted/Restocked`, folds `IsAvailable = MenuAvailable && InventoryAvailable && Quantity > 0` into a Postgres projection via raw upsert SQL, not EF change-tracking, so concurrent updates fold correctly. Check the file's comments before touching the recompute logic.

### Pricing (`OrderService/Services/PricingService.cs` + `Pricing/Contracts.cs`)
Stateless singleton computing subtotal/discounts/service charges/tax/total. Cart responses carry a live `estimate` from it — source money figures from there, don't recompute client-side.

### Notifications (`OrderService`: `Entities/Notification.cs`, `Services/NotificationService.cs`, `NotificationsController`)
Persisted, tenant-scoped, for table/order lifecycle events. Separate from the SignalR floor hub, which is live-only with no persistence.

### Diner ordering (customer-facing, `/order` in the frontend)
A second, anonymous-first surface on the same four services. Differences from staff flow:
- **Discovery is cross-tenant by design.** `GET /public/restaurants` (identity) lists discoverable restaurants/locations directly off `TenantDbContext` — they *are* the tenant, no filter to bypass. `GET /public/menu` (catalog) gates on identity's discoverability flag and **fails closed** — 503 if identity's unreachable, never an open menu.
- **A diner isn't staff.** OIDC client `spoontab-diner` uses the `password` grant (deliberate exception for the inline sign-in modal) and `diner` scope; policies check that scope plus `order.CustomerId`/`Payment.CustomerId` ownership against the caller.
- **Checkout is one call.** `POST /diner/checkout` commits and reserves inventory like "Fire to Kitchen", but `PaymentRequested` auto-publishes once inventory confirms (gated on `OrderType == Pickup`). Staff keep the two-step flow.
- **Abandonment needs a sweep.** No staff backstop for a diner, so `AbandonedOrderSweeper` cancels unpaid `Pickup` orders past a TTL (dine-in exempt), releases inventory.
- **Order history and notifications are cross-tenant too** — `CustomerOrderSummary`/`CustomerNotification` query by `CustomerId` across restaurants, written inline from the order lifecycle rather than projected.
- **Modifiers have a staff authoring UI.** `ModifierGroupsController` gives staff full CRUD, gated on existing `menu.read`/`menu.write`. Every write republishes the full modifier set as `MenuItemModifiersChanged` (a snapshot, never a delta); order's `PosReadModelProjector` folds it into `PosCatalogItem.Modifiers`, which `CatalogMenuClient` prices diner selections from locally instead of a synchronous call to catalog.

See `services/order/CLAUDE.md` and `services/frontend/CLAUDE.md` for implementation detail.

### Multi-tenancy (every request path)
`TenantMiddleware` (Common.Library) reads `X-Restaurant-Id`/`X-Location-Id` into an AsyncLocal context (falls back to `acme-bistro`/`sjc-01` if absent) → MassTransit filters propagate the same headers across events → `TenantEfRepository<T>` stamps tenant IDs on write → EF query filters enforce scoping on read, correct per-tenant via `ITenantScopedDbContext` + tenant model caching.

**Gotcha:** a long-running process started before a tenant-scoping fix ships keeps serving every request under whichever tenant built its EF model first, regardless of headers — restart is the fix, not a code change.

Frontend must build `x-restaurant-id`/`x-location-id` headers explicitly from `tenantAccessor()` — relying on `http.ts`'s JWT-inference interceptor is fragile and silently falls back to the default tenant when it misses.

### Shared libraries (`shared/`, published as NuGet via GitHub Packages)
- **Common.Library** — tenant repository/middleware, MassTransit setup, JWT auth, OpenTelemetry, Seq logging. Publishes on push to `dev`/`main` touching its folder, not tag-based.
- **Tenant.Domain** — EF entities (Restaurant, Location, RestaurantMembership) + Postgres DbContext, consumed by identity.
- **Messaging.Contracts** — shared event records under `Events/{Menu,Inventory,Order,Payment}`.

Each has its own `publish-*.yml` workflow, triggered independently of backend/frontend CI. **None bump the package version** — they pack whatever `<Version>` is in the `.csproj` and push with `--skip-duplicate`, so forgetting to bump silently no-ops instead of publishing.

### Infra
- Local: `local/docker-compose.yml` — Postgres, RabbitMQ, Seq only.
- Deployed: single VM (Caddy + Docker Compose, images from GHCR), see `deploy/README.md`. Postgres is Supabase, session-mode pooling on port `5432` — not the `6543` transaction-mode port, which desyncs EF Core's multi-statement migration batches. RabbitMQ runs as a container, not Azure Service Bus. Jaeger/Prometheus/Grafana are deployed too but with no persistent volumes — reset on every redeploy.
- An earlier AKS/Helm/Emissary/cert-manager path was explored but never deployed to; removed as dead code. `Common.Library`'s MassTransit setup still supports Azure Service Bus as a config switch, unused in practice.
