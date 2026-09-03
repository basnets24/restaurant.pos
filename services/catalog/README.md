# CatalogService (Restaurant POS)

Menu and stock API. .NET 10, PostgreSQL/EF Core, MassTransit/RabbitMQ, JWT Bearer auth.

## Features

- Tenant-aware CRUD for menu items, one table, stock included
- Publishes domain events off menu/stock changes; services the order saga's reserve/release inventory commands
- Anonymous `GET /public/menu` for the diner-facing surface
- **Stock lives on the menu item**, not a separate entity or endpoint
- **Modifiers** (single/multi-select add-ons like size or extras) are staff-managed

## API surface

- REST API under `/menu-items`: list, detail, create, update, delete, categories, availability, plus modifier-group management. Menu reads need `menu.read`; writes (including stock) need `menu.write` plus an Admin/Manager/Chef role.
- `quantity` on an update is absolute, not a delta, send the new on-hand count. Availability re-derives from it automatically unless explicitly overridden, and the right event (restocked/depleted/updated) fires based on the transition.
- The public menu endpoint is gated on the restaurant's discoverability flag and fails closed, if identity can't be reached to check, it serves no menu rather than an open one.
- Modifiers always publish as a full snapshot when changed, never a partial diff, so downstream consumers never have to reason about ordering.
- Publishes menu/stock change events, consumes inventory reserve/release commands from the order service. Inventory only ever gets released by an explicit cancellation, never a timeout, an abandoned order still holds its reservation.

## Config

`appsettings.json`, overridable via env vars: Postgres and RabbitMQ connections, OIDC authority, CORS origins, Seq/Jaeger.

## Getting Started

- Needs .NET SDK 10.0+, PostgreSQL and RabbitMQ, and identity running for JWT validation.
- Normally you don't run this by hand, `./local/dev.sh` from the repo root starts everything.

```bash
dotnet run --project services/catalog/src/CatalogService  # https://localhost:7226 / http://localhost:5062
```

---

License: Proprietary (internal project).
