# OrderService (Restaurant POS)

Cart, order, and dining-room service for the Restaurant POS platform: carts, order finalization, dining tables, pricing, notifications, and real-time table updates. Owns the order saga and a cross-service POS read model. Built with .NET 8, PostgreSQL/EF Core, MassTransit, SignalR, and JWT Bearer auth.

See [`CLAUDE.md`](./CLAUDE.md) in this folder for saga/consumer gotchas and the two-DbContext layout. This README covers running it and its API.

## Features
- Tenant-scoped carts, orders, and dining tables in PostgreSQL
- REST APIs for carts, orders, tables, and notifications
- Authorization via scopes and roles:

  | Policy | Requires |
  |---|---|
  | Read | `order.read` |
  | Write | `order.write` + role `Admin`, `Manager`, or `Server` |
  | `orders.assign-self` | Server |
  | `orders.manage-tables` | Server, Admin, or Manager |

- Pricing engine with configurable taxes, service charges, and discounts (appsettings) — cart responses carry a live `estimate` object, so the UI renders those figures rather than recomputing tax
- Persisted notifications for order/table lifecycle events (`/api/notifications`) — distinct from the SignalR hub, which is live-only broadcast with no persistence
- Real-time table updates over SignalR
- Diner-facing ordering (`/diner/*`, see below): checkout, cross-restaurant order history, a background sweep that cancels abandoned pickup orders, and customer-addressed notifications
- Serilog + Seq logging, CORS for the frontend, Swagger in Development

## Getting Started

### Prerequisites
- .NET SDK 8.0+
- PostgreSQL and RabbitMQ (both come from `local/docker-compose.yml`)
- The identity service running, for JWT validation

Normally you don't run this by hand — `./local/dev.sh` from the repo root starts infra plus all four services and the frontend.

### Configuration
From `appsettings.json`, overridable via environment variables or User Secrets.

- `ServiceSettings.Authority` — OIDC authority for JWT validation
- `PostgresSettings` — Host, Port, Database, Username, Password
- `RabbitMqSettings` — Host (plus credentials if your environment needs them)
- `Cors.AllowedOrigins` — allowed frontend origins
- `SeqSettings` — Seq host/port
- `QueueSettings` — queue addresses for inventory reserve/release and payment request
- `Pricing` — taxes, service charges, discounts (ids/names/percent/amount)

### Run standalone
```bash
dotnet run --project services/order/src/OrderService  # https://localhost:7288 / http://localhost:5236
```
- Swagger UI: `/swagger` (Development only)
- SignalR: the tables hub is mapped by the tables module

## API Overview

### Carts — `/carts`
| Method | Route | Notes |
|---|---|---|
| `POST` | `/carts` | Create a cart |
| `GET` | `/carts/{id}` | Get cart with computed pricing |
| `POST` | `/carts/{id}/items` | Add item |
| `DELETE` | `/carts/{id}/items/{menuItemId}` | Remove item |
| `POST` | `/carts/{id}/checkout` | Finalize cart to an order. This is **"Fire to Kitchen"** in the UI — it commits the order and reserves inventory. It does **not** take payment; that's a separate later call. |

### Orders — `/orders`
| Method | Route | Notes |
|---|---|---|
| `GET` | `/orders` | List orders |
| `GET` | `/orders/{id}` | Get order |
| `POST` | `/orders` | Create order from DTO (supports `idempotencyKey` query) |
| `POST` | `/orders/{orderId}/request-payment` | Publishes `PaymentRequested`, outside the saga; the payment service then creates a Stripe PaymentIntent |
| `POST` | `/orders/{orderId}/cancel` | Voids the order and publishes `ReleaseInventory` (the only place that event is published), plus an `OrderCancelled` notification. Manual operator action, not an automatic timeout. |

### Notifications — `/api/notifications`
| Method | Route | Notes |
|---|---|---|
| `GET` | `/api/notifications` | List notifications for the current tenant |
| `POST` | `/api/notifications/{id}/read` | Mark one as read |

### Diner — `/diner` (customer-facing, `DinerRead`/`DinerWrite` policies — `diner` scope, no role check, plus an ownership check on every route)
| Method | Route | Notes |
|---|---|---|
| `POST` | `/diner/quote` | Prices a cart without placing it — the same resolve-and-price path as checkout, persists nothing |
| `POST` | `/diner/checkout` | Commits the order and reserves inventory, like "Fire to Kitchen" — but payment is requested automatically once inventory is confirmed (`InventoryReservedConsumer`), so there's no separate diner call to request payment |
| `GET` | `/diner/orders` | The caller's own orders, tenant-scoped |
| `GET` | `/diner/orders/{orderId}` | One of the caller's own orders |
| `POST` | `/diner/orders/{orderId}/cancel` | Cancels the caller's own **unpaid** order — same `CancelAsync` path as staff cancel |
| `GET` | `/diner/history` | The caller's orders **across every restaurant** — ignores tenant headers by design |
| `GET` | `/diner/notifications` | The caller's own notifications, across every restaurant — also ignores tenant headers |
| `POST` | `/diner/notifications/{id}/read` | Mark one read |
| `POST` | `/diner/notifications/read-all` | Mark all read |

### Tables — `/api/tables`
| Method | Route | Notes |
|---|---|---|
| `GET` | `/api/tables` | List tables |
| `GET` | `/api/tables/{id}` | Table details |
| `POST` | `/api/tables` | Create table (layout) |
| `PATCH` | `/api/tables/{id}/layout` | Update layout (optimistic versioning) |
| `POST` | `/api/tables/layout/bulk` | Bulk layout update |
| `PATCH` | `/api/tables/{id}/status` | Set runtime status (available/reserved/occupied/dirty) |
| `POST` | `/api/tables/{id}/seat` | Mark occupied with party size |
| `POST` | `/api/tables/{id}/clear` | Clear to available |
| `POST` | `/api/tables/{id}/link-order` | Link an order/cart |
| `POST` | `/api/tables/{id}/unlink-order` | Unlink order/cart |
| `DELETE` | `/api/tables/{id}` | Delete table |

All endpoints are tenant-aware via `Common.Library.Tenancy`.

## Messaging & the saga

Uses MassTransit with saga orchestration, configured in `Program.cs`; interacts with catalog and payment via queues in `QueueSettings`.

**The saga is deliberately small — it covers inventory reservation only, not payment.** Checkout publishes `OrderSubmitted`; the saga sends `ReserveInventory` and, on `InventoryReserved`/`InventoryReserveFaulted`, transitions straight to `Confirmed`/`Rejected` and is done. It does not send `PaymentRequested` and has no payment timeout — both omissions are deliberate.

Payment is driven outside the saga by `OrderController.RequestPayment`, and payment/inventory outcomes are applied to the `Order` entity by handlers in `Consumers/` rather than by saga transitions. If an order's status looks wrong after a payment event, check the consumer, not the state machine.

Inventory is reserved at checkout and released when someone calls `POST /orders/{orderId}/cancel` — staff, a diner cancelling their own unpaid order (`POST /diner/orders/{orderId}/cancel`), or the `AbandonedOrderSweeper` background service, which cancels unpaid pickup orders past a configurable TTL (`AbandonedOrders` in `appsettings.json`; dine-in orders are exempt). Without one of those three, an abandoned order holds its reservation indefinitely.

## Project Layout
- `Program.cs` — DI for Postgres/EF Core, tenancy, MassTransit saga, auth, Swagger, CORS, SignalR
- `Controllers/` — carts, orders, tables, notifications, `DinerController`
- `Services/` — cart management, pricing, tables, notifications, `DinerOrderService`, `CustomerOrderHistoryService`, `CustomerNotificationService`, `AbandonedOrderSweeper`
- `Entities/` — tenant-scoped entities (`Order`, `Cart`, `DiningTable`, `Notification`) plus `CustomerOrderSummary`/`CustomerNotification`, which are **not** tenant-scoped (a diner's history/notifications span restaurants)
- `StateMachines/` — the MassTransit saga
- `Consumers/`, `Projections/` — messaging workflows and the POS read-model projector
- `Data/` — `OrderDbContext`, `OrderStateDbContext`, and their design-time factories
- `Auth/` — authorization policies (`order.read`, `order.write`, `DinerRead`, `DinerWrite`, etc.)
- `Dtos/`, `Extensions/`, `Hubs/`, `Settings/` — DTOs, helpers, SignalR hubs, typed settings

## Docker Build
The build needs a GitHub PAT with `read:packages` to restore the private `Common.Library` / `Messaging.Contracts` NuGet packages.

```bash
cd services/order
docker build --secret id=GH_OWNER --secret id=GH_PAT -t restaurant-pos/order-service:1.0.2 .

docker run -d -p 5236:5236 \
  -e PostgresSettings__Host="$postgresHost" \
  -e PostgresSettings__Password="$postgresPassword" \
  -e ServiceBusSettings__ConnectionString="$serviceBusConnString" \
  -e ServiceSettings__MessageBroker="SERVICEBUS" \
  --network pos_pos-net \
  --name order-service-v1.0.2 \
  restaurant-pos/order-service:1.0.2
```

## Production deployment

The actual production deploy is a single VM + Caddy + GHCR image pipeline, not AKS/Helm — see [`deploy/README.md`](../../deploy/README.md) at the repo root for the full CI/CD flow. Production runs the RabbitMQ broker shown above, not Azure Service Bus, despite the `ServiceBusSettings__ConnectionString` example — `ServiceSettings__MessageBroker` supports both, but only RabbitMQ is actually deployed.

---

License: Proprietary (internal project).
