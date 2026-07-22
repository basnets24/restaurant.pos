# CatalogService (Restaurant POS)

Menu and inventory API for the Restaurant POS platform — merged from the
former standalone `menu` and `inventory` services.
Provides tenant-aware CRUD for menu items and their linked inventory
records, publishes domain events, and services the checkout saga's
reserve/release inventory commands. Built with .NET 8, PostgreSQL/EF Core,
MassTransit/RabbitMQ, and JWT Bearer auth.

## Features
- Tenant-scoped menu items and inventory items stored in PostgreSQL
  (`MenuItems`, `InventoryItems` tables)
- REST API for menu items (list, detail, create, update, delete, set
  availability) and inventory items (list, detail, update, delete)
- Every menu item has a linked inventory record, created/synced/deleted
  in-process alongside it (previously two services reacting to each
  other's events over RabbitMQ; now the same process, so no broker
  round-trip for this internal sync)
- Authorization via scopes and roles:
  - Menu read: `menu.read`
  - Menu write: `menu.write` + roles `Admin|Manager|Chef`
  - Inventory read: `catalog.inventory.read`
  - Inventory write: `catalog.inventory.write` + roles `Admin|Manager`
- Publishes `MenuItemCreated/Updated/Deleted` and
  `InventoryItemRestocked/Depleted/Updated` events — `order`'s
  `PosCatalogItem` projector consumes these directly
- Consumes `ReserveInventory`/`ReleaseInventory` commands from `order`'s
  checkout saga, bound to the same queue names the standalone
  `inventory` service used (`inventory-reserve-inventory`,
  `inventory-release-inventory`) so `order`'s config needed no changes
- Serilog + Seq logging, CORS for the frontend, Swagger in Development

## Getting Started

### Prerequisites
- .NET SDK 8.0+
- PostgreSQL (local or container)
- RabbitMQ (local or container)
- Optional: Seq for structured logs

### Configuration
Defined in `appsettings.json` and overridable via environment variables or User Secrets.

- ServiceSettings
  - Authority: OIDC authority for JWT validation
- PostgresSettings
  - Host, Port, Database, Username, Password
- RabbitMqSettings
  - Host (and optional username/password if configured in your environment)
- Cors
  - AllowedOrigins: array of allowed frontend origins
- SeqSettings
  - Host, Port for Seq

### Build and Run Scripts

#### Setup & Run
```bash
#!/bin/bash
# Build and run Catalog Service (requires PostgreSQL, RabbitMQ, Identity Service)
cd services/catalog/src/CatalogService
dotnet restore
dotnet run  # http://localhost:5062
```

#### Docker Build
```bash
#!/bin/bash
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

**Note**: The Docker build requires a GitHub Personal Access Token with
`read:packages` permission to access private NuGet packages.

## API Overview

### Menu items — base route `/menu-items`
- `GET /menu-items` — list with filters `name`, `category`, `available`, `minPrice`, `maxPrice`, `page`, `pageSize` (requires `menu.read`)
- `GET /menu-items/{id}` — get by id (requires `menu.read`)
- `POST /menu-items` — create; also creates a linked inventory record at zero stock (requires `menu.write` + role)
- `PATCH /menu-items/{id}` — partial update; syncs the linked inventory record's cached name (requires `menu.write` + role)
- `DELETE /menu-items/{id}` — delete; also deletes the linked inventory record (requires `menu.write` + role)
- `GET /menu-items/categories` — list allowed categories (requires `menu.read`)
- `POST /menu-items/{id}:availability` — set availability boolean; syncs the linked inventory record (requires `menu.write` + role)

### Inventory items — base route `/inventory-items`
- `GET /inventory-items` — list with filters `name`, `available`, `minQty`, `page`, `pageSize` (requires `catalog.inventory.read`)
- `GET /inventory-items/{id}` — get by id (requires `catalog.inventory.read`)
- `PUT /inventory-items/{id}` — update quantity (delta) / availability; publishes `InventoryItemRestocked/Depleted/Updated` and syncs the linked menu item's `IsAvailable` (requires `catalog.inventory.write`)
- `DELETE /inventory-items/{id}` — delete (requires `catalog.inventory.write`)

Notes
- Requests are tenant-scoped via `Common.Library.Tenancy`; created items carry `RestaurantId` and `LocationId` from the tenant context.
- Controllers return simple paged results; repositories currently page in-memory.

## Messaging

- Publishes: `MenuItemCreated`, `MenuItemUpdated`, `MenuItemDeleted`, `InventoryItemRestocked`, `InventoryItemDepleted`, `InventoryItemUpdated`
- Consumes: `ReserveInventory`, `ReleaseInventory` (from `order`'s checkout saga, via the `inventory-reserve-inventory`/`inventory-release-inventory` queues)
- Configure RabbitMQ via `RabbitMqSettings`.
- Menu-item ↔ inventory-item sync (availability on the menu side, name/availability on the inventory side) happens via direct in-process calls, not consumers — both entities live in this same service now.

## Project Layout
- `Program.cs` — DI for Postgres/EF Core, MassTransit (including the explicit `inventory-reserve-inventory`/`inventory-release-inventory` receive endpoints), Tenancy, auth, Swagger, CORS
- `Controllers/` — menu items and inventory items APIs
- `Services/InventoryManager.cs` — inventory quantity/availability updates, event publishing, and direct menu-item availability sync
- `Entities/` — `MenuItem` and `InventoryItem`
- `Dtos.cs` — request/response DTOs and paging models for both
- `Auth/CatalogPolicyExtensions.cs` — authorization policies (`menu.read/write`, `catalog.inventory.read/write`)
- `Consumers/` — `ReserveInventoryConsumer`/`ReleaseInventoryConsumer` for the checkout saga

---

License: Proprietary (internal project).
