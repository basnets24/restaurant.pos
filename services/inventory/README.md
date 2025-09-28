# InventoryService (Restaurant POS)

Inventory management API for the Restaurant POS platform. Tracks stock for menu items, exposes tenant‑scoped queries and updates, and integrates with messaging to coordinate with ordering and menu services. Built with .NET 8, MongoDB, MassTransit/RabbitMQ, and JWT Bearer auth.

## Features
- Tenant‑scoped inventory items in MongoDB
- REST API: list, detail, update quantity/availability, delete
- Authorization via scopes and roles:
  - Read: `inventory.read`
  - Write: `inventory.write` + roles `Admin|Manager`
- Messaging integration:
  - Publishes: restocked/depleted/updated events
  - Consumes: menu created/updated/deleted, reserve/release inventory
- Serilog + Seq logging, CORS for the frontend, Swagger in Development

## Getting Started

### Prerequisites
- .NET SDK 8.0+
- MongoDB (local or container)
- RabbitMQ (local or container)
- Optional: Seq for structured logs

### Configuration
Configured via `appsettings.json` and overridable with environment variables or User Secrets.

- ServiceSettings
  - Authority: OIDC authority for JWT validation
- MongoDbSettings
  - Host, Port (and any additional credentials supported by your Common.Library setup)
- RabbitMqSettings
  - Host 
- Cors
  - AllowedOrigins: array of allowed frontend origins
- SeqSettings
  - Host, Port for Seq

### Build and Run Scripts

#### Setup & Run
```bash
#!/bin/bash
# Build and run Inventory Service (requires MongoDB, RabbitMQ, Identity Service)
cd services/inventory/src/InventoryService
dotnet restore
dotnet run  # http://localhost:5094
```

#### Docker Build
```bash
#!/bin/bash
# Build Docker image
cd services/inventory
docker build --secret id=GH_OWNER --secret id=GH_PAT -t restaurant-pos/inventory-service:1.0.2 .
docker run -d -p 5094:5094 \
  -e MongoDbSettings__ConnectionString="$cosmosDbString" \
  -e ServiceBusSettings__ConnectionString="$serviceBusConnString" \
  -e ServiceSettings__MessageBroker="SERVICEBUS" \
  --network pos_pos-net \
  --name inventory-service-v1.0.2 \
  restaurant-pos/inventory-service:1.0.2
```

### 🐳 Build & Push Docker Image (ARM64 TO AMD64 THAT IS AKS Compatible)
export version=1.0.0

docker buildx build \
  --platform linux/amd64 \
  --secret id=GH_OWNER --secret id=GH_PAT \
  -t "$ACR.azurecr.io/pos.inventory:$version" \
  --push .  




## API Overview

Base route: `/inventory-items`

- `GET /inventory-items` — list with filters `name`, `available`, `minQty`, `page`, `pageSize` (requires `inventory.read`)
- `GET /inventory-items/{id}` — get by id (requires `inventory.read`)
- `PUT /inventory-items/{id}` — update quantity/availability (requires `inventory.write` + role `Admin|Manager`)
- `DELETE /inventory-items/{id}` — delete (requires `inventory.write` + role)

Notes
- Endpoints and repositories are tenant‑aware via `Common.Library.Tenancy`.
- Updates publish inventory events when quantity or availability changes.

## Messaging

- Publishes (to other services):
  - `InventoryItemRestocked`, `InventoryItemDepleted`, `InventoryItemUpdated`
- Consumes:
  - From Menu: `MenuItemCreated`, `MenuItemUpdated`, `MenuItemDeleted`
  - From Order workflow: `ReserveInventory`, `ReleaseInventory`
  - Emits outcomes: `InventoryReserved`, `InventoryReserveFaulted`

## Project Layout
- `Program.cs` — DI for Mongo, MassTransit, Tenancy, auth, Swagger, CORS
- `Controllers/` — inventory items API
- `Services/` — inventory manager (business rules + event publishing)
- `Entities/` — MongoDB entities (`InventoryItem` and `MenuItem` projection)
- `Dtos.cs` — request/response DTOs and paging models
- `Auth/` — authorization policies (`inventory.read`, `inventory.write`)
- `Consumers/` — MassTransit consumers for menu and order workflows




---

License: Proprietary (internal project).
