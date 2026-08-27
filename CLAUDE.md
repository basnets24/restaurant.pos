# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Cloud-native, multi-tenant restaurant POS platform: .NET microservices + a React frontend, deployed on Azure Kubernetes Service. Event-driven (MassTransit + RabbitMQ locally / Azure Service Bus in prod), CQRS-ish read models, PostgreSQL everywhere (schema-per-service).

## Commands

### Local dev (all services + frontend)
```bash
cp .env.example .env   # first time only — fill in GH_PAT, POSTGRES_PASSWORD, IdentitySettings__AdminUserPassword, Stripe test keys
./scripts/dev.sh        # starts infra (postgres/rabbitmq/seq) via docker compose, then all 4 .NET services + frontend via dotnet run/npm run dev
./scripts/dev.sh stop   # stops the services this script started; infra containers keep running
```
`scripts/dev.sh` loads `.env`, waits for infra containers to be healthy, and trusts the local HTTPS dev cert automatically. Don't `docker compose up` the services themselves — only infra is containerized locally; each backend service runs directly via `dotnet run`.

- Frontend: http://localhost:5173
- Seq (logs): http://localhost:5341
- RabbitMQ management: http://localhost:15672
- Swagger per service: `<service-url>/swagger`

`local/docker-compose.yml` defines three containers — postgres, rabbitmq, seq — and `dev.sh` brings all of them up, waiting on all three for health. Jaeger/Prometheus/Grafana are not part of local dev (traces/metrics have nowhere to go locally); they're deployed in prod only, for demo purposes — see `deploy/README.md`.

### Backend (.NET — mixed TFMs)
**Target frameworks are not uniform.** `net10.0`: catalog, identity, payment. `net8.0`: order (blocked — MassTransit 9.x went commercially licensed) and all three shared libraries. Check the `.csproj` before assuming language/runtime features are available; .NET 8 goes EOL 2026-11-10.

```bash
dotnet build Restaurant.Pos.sln                                    # build everything
dotnet build services/order/src/OrderService/OrderService.csproj   # build one service
dotnet test services/identity/tests/IdentityService.Tests          # only test project in the repo (xUnit + Moq)
dotnet test services/identity/tests/IdentityService.Tests --filter "FullyQualifiedName~SomeTestClass"
```
No `global.json`, `Directory.Build.props`, or `.editorconfig` — each `.csproj` is self-contained. GitHub Packages restore requires `GH_PAT` (see NuGet.config) — same token used by `scripts/dev.sh` and CI (`secrets.GITHUB_TOKEN`).

### Frontend (`services/frontend`)
```bash
npm run dev            # vite dev server
npm run build           # tsc -b && vite build
npm run lint            # eslint
```

### CI reality check
`.github/workflows/backend-ci.yml` and `frontend-ci.yml` are the actual pipelines — just restore/build (backend) and build/docker-smoke-test (frontend); no lint, `dotnet test`, or E2E step runs in CI today. Trust `.github/workflows/*.yml` over any prose description of the pipeline.

## Architecture

### Services (4, each an independent ASP.NET Core Web API + own Postgres schema)
| Service | Path | Ports (https/http) | Notes |
|---|---|---|---|
| identity | `services/identity/src/IdentityService` | 7163/5265 | Duende IdentityServer (OAuth2/OIDC). Absorbed the former `tenant` service — onboarding, location/membership management live under `Features/Tenancy/`. |
| catalog | `services/catalog/src/CatalogService` | 7226/5062 | Merged former `menu` + `inventory` services. Entities: `MenuItem` (see below) plus `ModifierGroup`/`ModifierOption`; publishes `MenuItemCreated/Updated/Deleted`, `MenuItemModifiersChanged`, and `InventoryItem*` events. Also serves the anonymous `GET /public/menu`. |
| order | `services/order/src/OrderService` | 7288/5236 | Cart, ordering, dining tables, pricing, notifications, SignalR floor hub. Owns the order saga and the POS read-model projector (below). |
| payment | `services/payment/PaymentService` | 7182/5238 | Stripe **PaymentIntent** integration; decoupled from the saga (see below). |

`services/frontend` (React 19 + TS, TanStack Query, Tailwind v4, oidc-client-ts) is the only non-.NET service, port 5173 in dev.

There is no `menu`, `inventory`, or `tenant` service directory — those names refer to features living inside `catalog`/`identity`.

**Stock lives on the menu item.** Stock is `MenuItem`'s `Quantity` field — no `InventoryItem` entity, no `/inventory-items` endpoint, no separate inventory table. The `InventoryItem*` names in `Messaging.Contracts` are *event* names published off menu-item stock changes; they don't imply a second entity. Stock updates go through `PATCH /menu-items/{id}` → `MenuStockService`, where `quantity` is **absolute, not a delta**, and `IsAvailable` re-derives as `Quantity > 0` unless explicitly overridden. `CatalogService/Entities/` also holds `ModifierGroup`/`ModifierOption` (single/multi-select add-ons, e.g. size or extras) — staff-managed via `ModifierGroupsController`; see Diner ordering below.

### Order saga (`OrderService/StateMachines/OrderStateMachine.cs`, MassTransit)
The saga is deliberately kept small — it only covers inventory reservation, not payment:
1. Cart checkout (`POST /carts/{id}/checkout`) → `OrderSubmitted`. In the UI this is **"Fire to Kitchen"**, not "Pay" — firing commits the order and reserves inventory; paying is a separate, later step (`Pay` button). Don't assume checkout implies payment.
2. Saga → `ReserveInventory` → catalog's inventory consumer
3. On `InventoryReserved`/`InventoryReserveFaulted` → saga transitions straight to `Confirmed`/`Rejected`. That's the end of the saga's involvement — it does **not** send `PaymentRequested` and does **not** schedule a payment timeout. Both are deliberate; don't propose adding them.
4. `OrderController.RequestPayment` publishes `PaymentRequested` directly, outside the saga. Payment service's `PaymentRequestedConsumer` creates a Stripe **PaymentIntent** and publishes its client secret
5. Frontend polls for that client secret and confirms it client-side via an embedded Stripe `PaymentElement` (`StripeCheckoutDialog`) — no redirect to a Stripe-hosted page. It then calls `POST /orders/{orderId}/payment-confirm` (`PaymentSessionController`), which server-verifies the PaymentIntent with Stripe and publishes `PaymentSucceeded`/`PaymentFailed` **synchronously. There is no webhook endpoint.**
6. `PaymentSucceeded`/`PaymentFailed`/`InventoryReserveFaulted` are applied to the `Order` entity via `Consumers/`, independent of saga transitions — don't assume payment state changes flow through the state machine.

**Cancellation.** `POST /orders/{orderId}/cancel` (`OrderController` → `FinalOrderService`) voids an order and publishes `ReleaseInventory`, which catalog's `ReleaseInventoryConsumer` applies; it also raises an `OrderCancelled` notification. It is the **only** publisher of `ReleaseInventory`, and it's a manual operator action rather than a saga timeout — an order abandoned without anyone hitting cancel still holds its inventory.

### POS read model (`OrderService/Projections/PosReadModelProjector.cs`)
Consumes `MenuItemCreated/Updated/Deleted` + `InventoryItemUpdated/Depleted/Restocked` and maintains a Postgres projection (`OrderDbContext`) folding `IsAvailable = MenuAvailable && InventoryAvailable && Quantity > 0` at write time via raw upsert SQL rather than EF change-tracking, so concurrent menu and stock updates fold correctly into one flag. See the comments in the file before changing the recompute logic.

### Pricing (`OrderService/Services/PricingService.cs` + `Pricing/Contracts.cs`)
Stateless singleton that computes subtotal / discounts / service charges / tax / grand total. Cart responses carry a live `estimate` object from it — the frontend renders those numbers rather than computing tax client-side. If you're adding a money figure to the UI, source it from the estimate, don't recompute it.

### Notifications (`OrderService`: `Entities/Notification.cs`, `Services/NotificationService.cs`, `NotificationsController`)
Persisted, tenant-scoped notifications for dining-table and order lifecycle events (e.g. `OrderCancelled`); frontend consumes them via `domain/notifications`. Distinct from the SignalR floor hub, which is live-only broadcast with no persistence — the two are separate mechanisms, not layers of one.

### Diner ordering (customer-facing, `/order` in the frontend)
A second, anonymous-first surface alongside the staff POS, built on the same four services. Key differences from the staff flow, not a separate design:
- **Discovery is cross-tenant by design.** `GET /public/restaurants` (identity, `Features/Discovery/`) lists `IsActive && IsDiscoverable` restaurants/locations directly off `TenantDbContext` — `Restaurant`/`Location` aren't `ITenantEntity` rows, they *are* the tenant, so there's no query filter to bypass. `GET /public/menu` (catalog) is gated behind identity's discoverability flag via `LocationDirectoryClient`, and **fails closed** — a 503 if identity is unreachable, not an open menu.
- **A diner is not staff.** OIDC client `spoontab-diner` uses the `password` grant (a deliberate exception so the inline sign-in modal works) and the `diner` scope; `DinerWrite`/`DinerRead` policies require that scope with no role check, but every diner-facing read/write additionally checks `order.CustomerId`/`Payment.CustomerId` against the caller — ownership, not just scope, keeps one diner off another's orders.
- **Checkout is one call, not two.** `POST /diner/checkout` (`OrderService/Controllers/DinerController.cs`) commits the order and reserves inventory like staff's "Fire to Kitchen", but `PaymentRequested` then publishes automatically once inventory is confirmed (`InventoryReservedConsumer`, gated on `OrderType == Pickup`) rather than needing a separate staff-initiated call. Staff keep the two-step fire-then-pay flow unchanged.
- **Abandonment needs a sweep.** A diner has no staff backstop to cancel a walked-away order, so `AbandonedOrderSweeper` (order service, `BackgroundService`) cancels unpaid `Pickup` orders past a TTL (dine-in exempt) and releases their inventory — the same `ReleaseInventory` path as a manual cancel.
- **Order history and notifications are the other two cross-tenant exceptions** — `CustomerOrderSummary`/`CustomerNotification` are deliberately not `ITenantEntity`, queried by `CustomerId` across restaurants, and written inline from the order lifecycle rather than projected off events.
- **Modifiers have a staff authoring UI** (added 2026-08-05, superseding the earlier "seeded by script only" decision). Catalog's `ModifierGroupsController` (`/menu-items/{id}/modifier-groups`, `/modifier-groups/{id}`) gives staff full CRUD, gated on the existing `menu.read`/`menu.write` policies — no new scope. Every write republishes the item's full current modifier set as `MenuItemModifiersChanged` (a snapshot, never a delta), which order's `PosReadModelProjector` folds into `PosCatalogItem.Modifiers`; `CatalogMenuClient` in the order service now prices a diner's selections from that local projection instead of a synchronous call to catalog's `/public/menu`. `scripts/seed-discovery.sh` still seeds demo data, but it's no longer the only way modifiers get created.

See `services/order/CLAUDE.md` and `services/frontend/CLAUDE.md` for the implementation-level detail (consumers, DbContext layout, `domain/discovery`/`features/diner` structure).

### Multi-tenancy (every request path)
`TenantMiddleware` (Common.Library) reads `X-Restaurant-Id`/`X-Location-Id` headers into an AsyncLocal-backed context, falling back to hardcoded defaults (`acme-bistro`/`sjc-01`) if absent → MassTransit `TenantBusFilter`/`TenantConsumeFilter` propagate the same headers across events → `TenantEfRepository<T>` stamps tenant IDs on write → EF `HasQueryFilter`/`ApplyTenantQueryFilters` enforce tenant scoping on read, made correct per-tenant (not frozen to whichever tenant's request first compiled the model) via `ITenantScopedDbContext` + `TenantModelCacheKeyFactory`/`UseTenantModelCache()`.

**Gotcha:** a long-running service process started before a tenant-scoping fix ships will keep serving every request under whichever tenant built its EF model first, regardless of incoming headers — restarting the process is the fix, not a code change.

Frontend must build `x-restaurant-id`/`x-location-id` headers explicitly from `tenantAccessor()` (bound from `AuthProvider`'s `profile`) — relying on `http.ts`'s interceptor to infer tenant from a decoded JWT is fragile and silently falls back to the default tenant when it misses.

### Shared libraries (`shared/`, published as NuGet via GitHub Packages)
- **Common.Library** — `TenantEfRepository<T>`, `ITenantScopedDbContext`, tenant model caching, MassTransit setup, JWT bearer auth, tenancy middleware, OpenTelemetry, Seq logging. No MongoDB dependency. Publish trigger is push-to-`dev`/`main` touching `shared/Common.Library/**` (see `.github/workflows/publish-common-library.yml`), not tag-based.
- **Tenant.Domain** — EF Core entities (Restaurant, Location, RestaurantMembership) + Postgres DbContext, consumed by identity.
- **Messaging.Contracts** — shared event records under `Events/{Menu,Inventory,Order,Payment}`, referenced by every service that publishes or consumes those events.

Each has its own `publish-*.yml` workflow — a change to one of these three folders on `dev`/`main` triggers a pack-and-push, independent of the backend/frontend CI above. **None of these workflows bump the package version** — they just pack whatever `<Version>` is currently in the `.csproj` and push with `--skip-duplicate`, so forgetting to bump it before pushing silently no-ops instead of publishing.

### Infra
- Local: `local/docker-compose.yml` — Postgres, RabbitMQ, Seq. No Jaeger/Prometheus/Grafana locally (see below).
- Deployed: a single VM (Caddy + Docker Compose, images from GHCR) — see `deploy/README.md`. Postgres is Supabase (schema-per-service, Supavisor **session-mode** pooling — port `5432` on the pooler host, not the `6543` transaction-mode port. EF Core's multi-statement migration batches desync the wire protocol over transaction-mode pooling, so session mode is used for both migrations and normal app queries rather than special-casing one connection string per mode). RabbitMQ runs as a container alongside the services, not Azure Service Bus. Jaeger/Prometheus/Grafana are also deployed (public subdomains, demo purposes) but run with **no persistent volumes** — traces/metrics/dashboards reset on every redeploy.
- An earlier AKS/Emissary Ingress/cert-manager/Helm path (formerly `infra/helm/`, `infra/emissary-ingress/`, `infra/cert-manager/`, per-service `helm/` folders, `infra/terraform/` — `infra/` itself was later renamed to `local/` once only the dev compose stack remained) was explored but never actually deployed to; it's been removed as dead code. `Common.Library`'s MassTransit setup still supports Azure Service Bus as a config-switched alternative to RabbitMQ (`ServiceSettings:MessageBroker`), but nothing deployed uses it.
