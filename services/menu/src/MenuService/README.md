# MenuService (Restaurant POS)

Menu and catalog API for the Restaurant POS platform. Provides tenant‑aware CRUD for menu items, publishes domain events, and reacts to inventory events to keep availability in sync. Built with .NET 8, MongoDB, MassTransit/RabbitMQ, and JWT Bearer auth.

## Features
- Tenant‑scoped menu items stored in MongoDB
- REST API for list, detail, create, update, delete, set availability
- Authorization via scopes and roles:
  - Read: `menu.read`
  - Write: `menu.write` + roles `Admin|Manager|Chef`
- Publishes events on create/update/delete
- Consumers update availability on inventory events (depleted/restocked/updated)
- Serilog + Seq logging, CORS for the frontend, Swagger in Development

## Getting Started

### Prerequisites
- .NET SDK 8.0+
- MongoDB (local or container)
- RabbitMQ (local or container)
- Optional: Seq for structured logs

### Configuration
Defined in `appsettings.json` and overridable via environment variables or User Secrets.

- ServiceSettings
  - Authority: OIDC authority for JWT validation
- MongoDbSettings
  - Host, Port (and optional database/credentials if supported by Common.Library)
- RabbitMqSettings
  - Host (and optional username/password if configured in your environment)
- Cors
  - AllowedOrigins: array of allowed frontend origins
- SeqSettings
  - Host, Port for Seq

Example: set local secrets
```bash
# from this project directory
Dotnet user-secrets set "ServiceSettings:Authority" "https://localhost:7163"
```

### Run
```bash
dotnet run
```
- Swagger UI: `/swagger` (Development only)

## API Overview

Base route: `/menu-items`

- `GET /menu-items` — list with filters `name`, `category`, `available`, `minPrice`, `maxPrice`, `page`, `pageSize` (requires `menu.read`)
- `GET /menu-items/{id}` — get by id (requires `menu.read`)
- `POST /menu-items` — create (requires `menu.write` + role `Admin|Manager|Chef`)
- `PATCH /menu-items/{id}` — partial update (requires `menu.write` + role)
- `DELETE /menu-items/{id}` — delete (requires `menu.write` + role)
- `GET /menu-items/categories` — list allowed categories (requires `menu.read`)
- `POST /menu-items/{id}:availability` — set availability boolean (requires `menu.write` + role)

Notes
- Requests are tenant‑scoped via `Common.Library.Tenancy`; created items carry `RestaurantId` and `LocationId` from the tenant context.
- Controller returns simple paged results; repository currently pages in‑memory.

## Messaging

- Publishes: `MenuItemCreated`, `MenuItemUpdated`, `MenuItemDeleted`
- Consumes (from Inventory): `InventoryItemDepleted`, `InventoryItemRestocked`, `InventoryItemUpdated`
- Configure RabbitMQ via `RabbitMqSettings`.

## Project Layout
- `Program.cs` — DI for Mongo, MassTransit, Tenancy, auth, Swagger, CORS
- `Controllers/` — menu items API
- `Entities/` — `MenuItem` entity and categories
- `Dtos.cs` — request/response DTOs and paging models
- `Auth/` — authorization policies (`menu.read`, `menu.write`)
- `Consumers/` — MassTransit consumers for inventory events

---

License: Proprietary (internal project).
