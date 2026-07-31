# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Cloud-native, multi-tenant restaurant POS platform: .NET 8 microservices + a React frontend, deployed on Azure Kubernetes Service. Event-driven (MassTransit + RabbitMQ locally / Azure Service Bus in prod), CQRS-ish read models, PostgreSQL everywhere (schema-per-service).

## Commands

### Local dev (all services + frontend)
```bash
cp .env.example .env   # first time only — fill in GH_PAT, POSTGRES_PASSWORD, IdentitySettings__AdminUserPassword, Stripe test keys
./scripts/dev.sh        # starts infra (postgres/rabbitmq/seq) via docker compose, then all 4 .NET services + frontend via dotnet run/npm run dev
./scripts/dev.sh stop   # stops the services this script started; infra containers keep running
```
`scripts/dev.sh` loads `.env`, waits for infra containers to be healthy, and trusts the local HTTPS dev cert automatically. Don't `docker compose up` the services themselves — only infra (postgres, rabbitmq, seq) is containerized locally; each backend service runs directly via `dotnet run`.

- Frontend: http://localhost:5173
- Seq (logs): http://localhost:5341
- RabbitMQ management: http://localhost:15672
- Swagger per service: `<service-url>/swagger`
- Jaeger/Prometheus/Grafana: see MONITORING.md (added for tracing/metrics, run locally too)

### Backend (.NET 8)
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
`.github/workflows/backend-ci.yml` and `frontend-ci.yml` are the actual pipelines — just restore/build (backend) and build/docker-smoke-test (frontend); no lint or `dotnet test` step runs in CI today. **CI_CD_PIPELINE.md is an aspirational design doc**, not a description of current workflows — it still refers to a 6-service split (menu/inventory/tenant as separate services) that predates the identity/tenant and catalog/menu/inventory merges. Trust `.github/workflows/*.yml` over that doc.

## Architecture

### Services (4, each an independent ASP.NET Core Web API + own Postgres schema)
| Service | Path | Ports (https/http) | Notes |
|---|---|---|---|
| identity | `services/identity/src/IdentityService` | 7163/5265 | Duende IdentityServer (OAuth2/OIDC). Absorbed the former `tenant` service — onboarding, location/membership management live under `Features/Tenancy/`. |
| catalog | `services/catalog/src/CatalogService` | 7226/5062 | Merged former `menu` + `inventory` services. Menu items + inventory items in one `catalog` schema; publishes `MenuItemCreated/Updated/Deleted` and `InventoryItem*` events. |
| order | `services/order/src/OrderService` | 7288/5236 | Cart, ordering, dining tables, SignalR floor hub. Owns the order saga and the POS read-model projector (below). |
| payment | `services/payment/PaymentService` | 7182/5238 | Stripe Checkout integration; decoupled from the saga (see below). |

`services/frontend` (React 19 + TS, TanStack Query, Tailwind v4, oidc-client-ts) is the only non-.NET service, port 5173 in dev.

There is no `menu`, `inventory`, or `tenant` service directory anymore — if you see those names in docs (README's "Microservices" section, CI_CD_PIPELINE.md), they refer to features now living inside `catalog`/`identity`, not standalone services.

### Order saga (`OrderService/StateMachines/OrderStateMachine.cs`, MassTransit)
The saga is deliberately kept small — it only covers inventory reservation, not payment:
1. Cart checkout → `OrderSubmitted`
2. Saga → `ReserveInventory` → catalog's inventory consumer
3. On `InventoryReserved`/`InventoryReserveFaulted` → saga transitions straight to `Confirmed`/`Rejected`. That's the end of the saga's involvement — it does **not** send `PaymentRequested` and does **not** schedule a payment timeout (an earlier design did; it was deliberately removed to keep the saga small)
4. `OrderController.RequestPayment` publishes `PaymentRequested` directly, outside the saga. Payment service's `PaymentRequestedConsumer` creates a Stripe **PaymentIntent** (not a Checkout Session, despite the name) and publishes its client secret
5. Frontend polls for that client secret and confirms it client-side via an embedded Stripe `PaymentElement` (`StripeCheckoutDialog`) — no redirect to a Stripe-hosted page. It then calls the backend's `POST /orders/{orderId}/payment-confirm` (`PaymentSessionController`), which server-verifies the PaymentIntent with Stripe and publishes `PaymentSucceeded`/`PaymentFailed` **synchronously — there is no webhook endpoint in the current code** (confirmed 2026-07-23; `services/payment/README.md` still documents a Checkout Session + `/webhooks/stripe` design — that doc is stale)
6. `PaymentSucceeded`/`PaymentFailed`/`InventoryReserveFaulted` are applied to the `Order` entity via `Consumers/`, independent of saga transitions — don't assume payment state changes flow through the state machine.

**Known gap (2026-07-30):** the `ReleaseInventory` queue/consumer pipeline is fully wired (catalog side works), but nothing in the order service publishes it — there's no order cancel/void endpoint yet, so inventory reserved for an order that's abandoned or never paid is never restored. A manual cancel endpoint is planned; this is intentionally not a saga timeout (see saga note above).

### POS read model (`OrderService/Projections/PosReadModelProjector.cs`)
Consumes `MenuItemCreated/Updated/Deleted` + `InventoryItemUpdated/Depleted/Restocked` and maintains a Postgres projection (`OrderDbContext`) folding `IsAvailable = MenuAvailable && InventoryAvailable && Quantity > 0` at write time via raw upsert SQL — not a Mongo `SetOnInsert`/`Set` split (that pattern was retired with the Mongo→Postgres migration; see comments in the file for why the recompute logic looks the way it does).

### Multi-tenancy (every request path)
`TenantMiddleware` (Common.Library) reads `X-Restaurant-Id`/`X-Location-Id` headers into an AsyncLocal-backed context, falling back to hardcoded defaults (`acme-bistro`/`sjc-01`) if absent → MassTransit `TenantBusFilter`/`TenantConsumeFilter` propagate the same headers across events → `TenantEfRepository<T>` stamps tenant IDs on write → EF `HasQueryFilter`/`ApplyTenantQueryFilters` enforce tenant scoping on read, made correct per-tenant (not frozen to whichever tenant's request first compiled the model) via `ITenantScopedDbContext` + `TenantModelCacheKeyFactory`/`UseTenantModelCache()`.

**Gotcha:** a long-running service process started before a tenant-scoping fix ships will keep serving every request under whichever tenant built its EF model first, regardless of incoming headers — restarting the process is the fix, not a code change.

Frontend must build `x-restaurant-id`/`x-location-id` headers explicitly from `tenantAccessor()` (bound from `AuthProvider`'s `profile`) — relying on `http.ts`'s interceptor to infer tenant from a decoded JWT is fragile and silently falls back to the default tenant when it misses.

### Shared libraries (`shared/`, published as NuGet via GitHub Packages)
- **Common.Library** — `TenantEfRepository<T>`, `ITenantScopedDbContext`, tenant model caching, MassTransit setup, JWT bearer auth, tenancy middleware, OpenTelemetry, Seq logging. No MongoDB dependency. Publish trigger is push-to-`dev`/`main` touching `shared/Common.Library/**` (see `.github/workflows/publish-common-library.yml`), not tag-based.
- **Tenant.Domain** — EF Core entities (Restaurant, Location, RestaurantMembership) + Postgres DbContext, consumed by identity.
- **Messaging.Contracts** — shared event records under `Events/{Menu,Inventory,Order,Payment,Sagas}`, referenced by every service that publishes or consumes those events.

Each has its own `publish-*.yml` workflow — a change to one of these three folders on `dev`/`main` triggers a version bump + NuGet publish independent of the backend/frontend CI above.

### Infra
- Local: `infra/docker-compose.yml` — Postgres, RabbitMQ, Seq only (see MONITORING.md for the Jaeger/Prometheus/Grafana stack).
- Deployed: Supabase (Postgres, schema-per-service, Supavisor transaction pooling), Azure Service Bus, AKS with Emissary Ingress + cert-manager, Helm charts in `infra/helm/` (shared chart in `infra/helm/microservice/` used by each service's `helm/` folder).
