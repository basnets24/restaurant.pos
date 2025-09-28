# OrderService (Restaurant POS)

Order and dining room service for the Restaurant POS platform. Manages carts, finalizes orders, tracks dining tables and emits real‑time updates. Integrates with inventory and payment via messaging. Built with .NET 8, MongoDB, MassTransit, SignalR, and JWT Bearer auth.

## Features
- Tenant‑scoped carts, orders, and dining tables in MongoDB
- REST APIs for carts (add/remove items, checkout), orders, and tables (layout and runtime status)
- Authorization via scopes and roles:
  - Read: `order.read`
  - Write: `order.write` + roles `Admin|Manager|Server`
  - Policies: `orders.assign-self` (Server), `orders.manage-tables` (Server|Admin|Manager)
- Pricing engine with configurable taxes, service charges, and discounts (appsettings)
- Messaging orchestration (MassTransit): reserves/releases inventory, requests payment, reacts to events
- Real‑time table updates over SignalR
- Serilog + Seq logging, CORS for the frontend, Swagger in Development

## Getting Started

### Prerequisites
- .NET SDK 8.0+
- MongoDB (local or container)
- RabbitMQ (local or container)
- Optional: Seq for structured logs

### Configuration
Configured in `appsettings.json` and overridable via environment variables or User Secrets.

- ServiceSettings
  - Authority: OIDC authority for JWT validation
- MongoDbSettings
  - Host, Port (and optional credentials if supported by your Common.Library setup)
- RabbitMqSettings
  - Host (and optional username/password when required)
- Cors
  - AllowedOrigins: array of allowed frontend origins
- SeqSettings
  - Host, Port for Seq
- QueueSettings
  - Queue addresses for inventory reserve/release and payment request
- Pricing
  - Taxes, ServiceCharges, Discounts (ids/names/percent/amount)

Example: set local secrets
```bash
# from this project directory
dotnet user-secrets set "ServiceSettings:Authority" "https://localhost:7163"
```

### Build and Run Scripts

#### Setup & Run
```bash
#!/bin/bash
# Build and run Order Service (requires MongoDB, RabbitMQ, Identity Service)
cd services/order/src/OrderService
dotnet restore
dotnet run  # http://localhost:5236
```

#### Docker Build
```bash
#!/bin/bash
# Build Docker image
cd services/order
docker build --secret id=GH_OWNER --secret id=GH_PAT -t restaurant-pos/order-service:1.0.2 .
docker run -d -p 5236:5236 \
-e MongoDbSettings__ConnectionString="$cosmosDbString" \
-e ServiceBusSettings__ConnectionString="$serviceBusConnString" \
-e ServiceSettings__MessageBroker="SERVICEBUS" \
--network pos_pos-net \
--name order-service-v1.0.2 \
restaurant-pos/order-service:1.0.2

```

### 🐳 Build & Push Docker Image (ARM64 TO AMD64 THAT IS AKS Compatible)
export version=1.0.0

docker buildx build \
  --platform linux/amd64 \
  --secret id=GH_OWNER --secret id=GH_PAT \
  -t "$ACR.azurecr.io/pos.order:$version" \
  --push .  


### Manual Steps

#### Run
```bash
dotnet run
```
- Swagger UI: `/swagger` (Development only)
- SignalR: tables hub is mapped by the tables module

## API Overview

- Carts (`/carts`)
  - `POST /carts` — create a cart
  - `GET /carts/{id}` — get cart with computed pricing
  - `POST /carts/{id}/items` — add item
  - `DELETE /carts/{id}/items/{menuItemId}` — remove item
  - `POST /carts/{id}/checkout` — finalize cart to an order

- Orders (`/orders`)
  - `GET /orders` — list orders
  - `GET /orders/{id}` — get order
  - `POST /orders` — create order from DTO (supports `idempotencyKey` query)

- Tables (`/api/tables`)
  - `GET /api/tables` — list tables
  - `GET /api/tables/{id}` — table details
  - `PATCH /api/tables/{id}/status` — set runtime status (available/reserved/occupied/dirty)
  - `POST /api/tables/{id}/seat` — mark occupied with party size
  - `POST /api/tables/{id}/clear` — clear to available
  - `POST /api/tables/{id}/link-order` — link an order/cart
  - `POST /api/tables/{id}/unlink-order` — unlink order/cart
  - `POST /api/tables` — create table (layout)
  - `PATCH /api/tables/{id}/layout` — update layout (optimistic versioning)
  - `POST /api/tables/layout/bulk` — bulk layout update
  - `DELETE /api/tables/{id}` — delete table

Notes
- Endpoints are tenant‑aware via `Common.Library.Tenancy`.
- `Pricing` section controls automatic service charge, taxes, and discounts applied to orders.

## Messaging

- Uses MassTransit with saga orchestration (configured in `Program.cs`).
- Interacts with Inventory and Payment via queues set in `QueueSettings`.
- Publishes domain events and consumes workflow events; inventory is reserved on checkout and released on failure/cancel.

## Project Layout
- `Program.cs` — DI for Mongo, Tenancy, MassTransit saga, auth, Swagger, CORS, SignalR
- `Controllers/` — carts, orders, tables
- `Services/` — cart management, pricing, tables service
- `Dtos/` — request/response DTOs
- `Entities/` — MongoDB entities (Order, Cart, DiningTable, etc.)
- `Auth/` — authorization policies (`order.read`, `order.write`, etc.)
- `Consumers/`, `StateMachines/`, `Projections/` — messaging workflows and projections
- `Extensions/`, `Hubs/`, `Settings/` — helpers, SignalR hubs, typed settings

---

License: Proprietary (internal project).
