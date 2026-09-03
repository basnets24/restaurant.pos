# Restaurant POS

A cloud-native, multi-tenant restaurant POS platform: four .NET microservices plus a React frontend, event-driven via MassTransit/RabbitMQ, deployed to a single VM behind Caddy.

**Live demo:** [spoontab.com](https://spoontab.com)

## Quick Start

**Prerequisites**: .NET SDK 10, Node 20+, Docker, a GitHub PAT with `read:packages` (private NuGet packages live in GitHub Packages).

```bash
cp .env.example .env
# fill in GH_PAT, POSTGRES_PASSWORD, IdentitySettings__AdminUserPassword,
# and a Stripe test key if you want to exercise payment flows
```

```bash
./local/dev.sh        # starts infra (docker compose) + all 4 services + frontend
./local/dev.sh stop   # stops the services this script started; infra keeps running
```

`local/dev.sh` loads `.env`, waits for infra to be healthy, and trusts the local HTTPS dev cert automatically. Only infrastructure runs in Docker locally — each backend service runs directly via `dotnet run`, and the frontend via `npm run dev`.

| | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Swagger (per service) | `<service-url>/swagger` |
| Seq (logs) | http://localhost:5341 |
| RabbitMQ management | http://localhost:15672 |

### Troubleshooting

| Symptom | Fix |
|---|---|
| NuGet restore fails | `GH_PAT` isn't set in `.env`, or lacks `read:packages` |
| Postgres auth error | `POSTGRES_PASSWORD` in `.env` doesn't match what services expect — `local/dev.sh` derives `PostgresSettings__Password` from it automatically, so don't set that separately |
| A service can't reach RabbitMQ | Check `docker compose ps` in `local/` — infra containers may not have come up healthy |
| 401s despite a valid login | Check the JWT's tenant claims (`restaurant_id`/`location_id`) match the `X-Restaurant-Id`/`X-Location-Id` headers being sent |

## Architecture

Four independent ASP.NET Core services, each owning its own Postgres schema:

| Service | Path | Port (https/http) | Owns |
|---|---|---|---|
| **identity** | `services/identity` | 7163 / 5265 | Auth (Duende IdentityServer/OIDC), restaurant onboarding, location & membership management |
| **catalog** | `services/catalog` | 7226 / 5062 | Menu items and stock levels |
| **order** | `services/order` | 7288 / 5236 | Cart, orders, pricing, dining tables, notifications, the order saga, and a cross-service POS read model |
| **payment** | `services/payment` | 7182 / 5238 | Stripe PaymentIntent creation and server-side confirmation |

`services/frontend` (port 5173) is the only non-.NET piece — a React SPA that talks to each service directly (no API gateway/BFF).

**Event-driven, not request-chained.** Services publish/consume domain events over RabbitMQ via MassTransit (locally and in prod — Azure Service Bus is a config-switched alternative the codebase supports but nothing deployed uses). A deliberately small saga in `order` covers inventory reservation only — checkout reserves stock, and payment is a separate step requested afterward, not part of the saga. Catalog's menu/stock events are folded into a local read model inside `order` for fast POS reads, the same pattern a `git log`/code read will show repeated for any new cross-service read.

**Multi-tenant on every request.** Each request carries `X-Restaurant-Id`/`X-Location-Id`; middleware scopes that tenant through the request, across published events, and into EF Core query filters on write and read. Nothing in a service's own schema is queryable outside its tenant by default.

**Auth**: OAuth 2.0/OIDC via Duende IdentityServer, JWT bearer tokens, role- and scope-based API policies layered on top of tenant scoping.

### Tech stack
- **Frontend** — React 19, TypeScript, TanStack Query, Tailwind CSS, SignalR, oidc-client-ts
- **Backend** — ASP.NET Core Web API (.NET 10, with `order` and shared libraries on .NET 8), EF Core
- **Data** — PostgreSQL, schema-per-service
- **Messaging** — MassTransit + RabbitMQ (local and prod)
- **Observability** — Seq (local + prod); OpenTelemetry → Jaeger/Prometheus/Grafana (prod only, demo purposes, ephemeral/no persistence)
- **Infra** — Docker, Caddy, GitHub Actions (build/push to GHCR + deploy)

## Project Structure

```
services/    frontend, identity, catalog, order, payment — see each service's own README
shared/      Common.Library, Messaging.Contracts, Tenant.Domain — published as NuGet via GitHub Packages
local/       docker-compose (local dev stack only) — see local/README.md
deploy/      production compose + Caddyfile for the deployed VM — see deploy/README.md
```

Each service and the frontend has its own `README.md`/`CLAUDE.md` with service-specific commands, structure, and gotchas — start there once you're working inside one.

## Cloud Deployment

- A single VM running Docker Compose behind **Caddy** (automatic Let's Encrypt TLS), images pulled from **GHCR**, data on **Supabase Postgres** (schema-per-service, session-mode pooling)
- GitHub Actions builds/pushes images then deploys over SSH — see [`deploy/README.md`](./deploy/README.md) for the full CI/CD flow and required secrets
- An earlier AKS/ACR/Azure Key Vault/Azure Service Bus design was explored but never actually deployed to; that path (Helm charts, Emissary Ingress, cert-manager) has been removed as dead code
