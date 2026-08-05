# CatalogService (Restaurant POS)

Menu and stock API for the Restaurant POS platform — merged from the former
standalone `menu` and `inventory` services. Provides tenant-aware CRUD for menu
items, publishes domain events, and services the order saga's reserve/release
inventory commands. Built with .NET 10, PostgreSQL/EF Core, MassTransit/RabbitMQ,
and JWT Bearer auth.

**Stock lives on the menu item.** Stock is `MenuItem.Quantity` — there is no
separate inventory entity, table, or endpoint. The `InventoryItem*` **event
names** are still published off menu-item stock changes; they name events, not
a second entity. `Entities/` additionally holds `ModifierGroup`/`ModifierOption`
(single/multi-select add-ons such as size or extras), staff-managed via
`ModifierGroupsController` — see Diner ordering below.

## Features
- Tenant-scoped menu items in PostgreSQL — one `MenuItems` table, stock included
- REST API for menu items: list, detail, create, update (incl. stock), delete,
  categories, set availability
- Authorization via scopes and roles:
  - Menu read: `menu.read`
  - Menu write: `menu.write` + roles `Admin|Manager|Chef` — this covers stock changes too
- Publishes `MenuItemCreated/Updated/Deleted` and
  `InventoryItemRestocked/Depleted/Updated` — the order service's
  `PosReadModelProjector` consumes both families to fold one `IsAvailable` flag
- Consumes `ReserveInventory`/`ReleaseInventory` from the order service, on the
  `inventory-reserve-inventory` / `inventory-release-inventory` queues
- Anonymous `GET /public/menu` for the diner-facing surface (see below)
- Serilog + Seq logging, OpenTelemetry, CORS for the frontend, Swagger in Development

## Getting Started

### Prerequisites
- .NET SDK 10.0+
- PostgreSQL and RabbitMQ (both come from `infra/docker-compose.yml`)
- The identity service running, for JWT validation

Normally you don't run this by hand — `./scripts/dev.sh` from the repo root starts
infra plus all four services and the frontend.

### Configuration
From `appsettings.json`, overridable via environment variables or User Secrets.

- `ServiceSettings.Authority` — OIDC authority for JWT validation
- `PostgresSettings` — Host, Port, Database, Username, Password
- `RabbitMqSettings` — Host (plus credentials if your environment needs them)
- `Cors.AllowedOrigins` — allowed frontend origins
- `SeqSettings`, `JaegerSettings` — logging and tracing

### Run standalone
```bash
dotnet run --project services/catalog/src/CatalogService  # https://localhost:7226 / http://localhost:5062
```

## API Overview

All routes are under `/menu-items`.

| Method | Route | Notes |
|---|---|---|
| `GET` | `/menu-items` | List; filters `name`, `category`, `available`, `minPrice`, `maxPrice`, `page`, `pageSize` (`menu.read`) |
| `GET` | `/menu-items/{id}` | Get by id (`menu.read`) |
| `GET` | `/menu-items/categories` | Allowed categories (`menu.read`) |
| `POST` | `/menu-items` | Create (`menu.write` + role) |
| `PATCH` | `/menu-items/{id}` | Partial update — including `quantity`, which is how stock changes (`menu.write` + role) |
| `DELETE` | `/menu-items/{id}` | Delete (`menu.write` + role) |
| `POST` | `/menu-items/{id}:availability` | Set availability boolean (`menu.write` + role) |
| `GET` | `/menu-items/{menuItemId}/modifier-groups` | List an item's modifier groups + options (`menu.read`) |
| `POST` | `/menu-items/{menuItemId}/modifier-groups` | Create a group with its options in one call (`menu.write` + role) |
| `PUT` | `/modifier-groups/{id}` | Replace a group's name/selection/required + its full option list — submitted options carry `id` to update in place, omit it to add, drop an existing one to delete it (`menu.write` + role) |
| `DELETE` | `/modifier-groups/{id}` | Delete a group; options cascade with it (`menu.write` + role) |

### Stock semantics (`MenuStockService.ApplyStockChangeAsync`)
- `quantity` is **absolute, not a delta** — send the new on-hand count.
- If an explicit availability override is supplied it always wins; otherwise
  `IsAvailable` is re-derived as `Quantity > 0` whenever quantity changes.
- Which event fires depends on the transition: `0 → >0` publishes
  `InventoryItemRestocked`, `>0 → 0` publishes `InventoryItemDepleted`, anything
  else publishes `InventoryItemUpdated`. A no-op change publishes nothing and logs
  a warning.

Notes
- Requests are tenant-scoped via `Common.Library.Tenancy`; created items carry
  `RestaurantId` and `LocationId` from the tenant context.
- Controllers return simple paged results; repositories currently page in memory.

## Diner ordering

`GET /public/menu?restaurantId=&locationId=` — anonymous, returns available
items (`IsAvailable && Quantity > 0`) grouped by category, each with its
`modifierGroups[]` nested. Deliberately narrower than the staff `MenuItemDto`:
no stock levels, no timestamps.

**Gated on discoverability, and fails closed.** `Features/PublicMenu/LocationDirectoryClient.cs`
asks identity's `public/restaurants/{r}/locations/{l}` (catalog has no copy of
`IsDiscoverable` — it belongs to identity's `Location`, and projecting it would
mean two sources of truth for who is publicly visible) and 404s the menu when
that 404s. Unlike the order service's `TenantDirectoryClient` (which decorates
a history row and swallows errors), this is an authorization gate: an
unreachable identity returns `503`, not an open menu. Answers cache for one
minute — short, because a stale `true` would keep serving a menu the restaurant
just took down.

`ModifierGroup`/`ModifierOption` (`SelectionType`: `Single`|`Multi`, `Required`,
tenant-scoped) are staff-managed through `ModifierGroupsController` (see the API
table above) — `scripts/seed-discovery.sh` still seeds demo data but is no
longer the only writer. Every create/update/delete republishes the item's full
current modifier set as `MenuItemModifiersChanged` (`Messaging.Contracts`,
`Events/Menu`) — always the complete snapshot, never a delta, so a consumer
never has to diff or reason about arrival order. The order service used to
resolve modifier prices live from this endpoint at checkout time; it now folds
`MenuItemModifiersChanged` into its own `PosCatalogItem.Modifiers` projection
and prices from that instead, so a negative `PriceDelta` still can't be forged
client-side, without the synchronous cross-service call (see
`services/order/CLAUDE.md`).

## Messaging
- **Publishes**: `MenuItemCreated`, `MenuItemUpdated`, `MenuItemDeleted`,
  `InventoryItemRestocked`, `InventoryItemDepleted`, `InventoryItemUpdated`,
  `MenuItemModifiersChanged`
- **Consumes**: `ReserveInventory`, `ReleaseInventory` from the order service, via
  the `inventory-reserve-inventory` / `inventory-release-inventory` queues

`ReleaseInventory` is only ever published by the order service's
`POST /orders/{orderId}/cancel` — it's a manual operator action, not an automatic
timeout, so an abandoned order still holds its reservation.

## Project Layout
- `Program.cs` — DI for Postgres/EF Core, MassTransit (including the explicit
  `inventory-reserve-inventory`/`inventory-release-inventory` receive endpoints),
  tenancy, auth, Swagger, CORS
- `Controllers/MenuItemsController.cs` — the staff menu/stock controller
- `Controllers/ModifierGroupsController.cs` — staff modifier-group CRUD
- `Services/MenuStockService.cs` — stock/availability transitions and event publishing
- `Entities/MenuItem.cs`, `Entities/ModifierGroup.cs` (also holds `ModifierOption`)
- `Dtos.cs` — request/response DTOs and paging models
- `Auth/CatalogPolicyExtensions.cs` — `menu.read` / `menu.write` policies
- `Features/PublicMenu/` — `PublicMenuController`, `PublicMenuService`, `LocationDirectoryClient`
- `Features/Modifiers/` — `ModifierGroupService` (bypasses the generic repository for `Include`/diff support, same reason `PublicMenuService` does) + its DTOs
- `Consumers/` — `ReserveInventoryConsumer`, `ReleaseInventoryConsumer`
- `Exceptions/` — `InsufficientInventoryException`, `UnknownItemException`

## Docker Build
The build needs a GitHub PAT with `read:packages` to restore the private
`Common.Library` / `Messaging.Contracts` NuGet packages.

```bash
cd services/catalog
docker build --secret id=GH_OWNER --secret id=GH_PAT -t restaurant-pos/catalog-service:1.0.0 .

docker run -d -p 5062:5062 \
  -e PostgresSettings__Host="$postgresHost" \
  -e PostgresSettings__Password="$postgresPassword" \
  -e ServiceBusSettings__ConnectionString="$serviceBusConnString" \
  -e ServiceSettings__MessageBroker="SERVICEBUS" \
  --network pos_pos-net \
  --name catalog-service-v1.0.0 \
  restaurant-pos/catalog-service:1.0.0
```

---

License: Proprietary (internal project).
