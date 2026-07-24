# CLAUDE.md — Order Service

Guidance for Claude Code when working in `services/order`. See the repo-root [`CLAUDE.md`](../../CLAUDE.md) for cross-service architecture (multi-tenancy, shared packages, saga overview) — this file only covers what's specific to this service.

## Commands
```bash
dotnet build services/order/src/OrderService/OrderService.csproj
dotnet run --project services/order/src/OrderService/OrderService.csproj --urls "https://localhost:7288;http://localhost:5236"
```
No dedicated test project for this service (the only test project in the repo is `services/identity/tests/IdentityService.Tests`).

## What this service owns
Cart → order → dining-table management, the order saga, and the cross-service POS read model. It's the busiest consumer/producer in the event graph: it both drives the saga and projects events from catalog and payment into a local read model.

## Structure (`src/OrderService/`)
- `Controllers/` — `CartController`, `OrderController`, `TableController` (thin, delegate to `Services/`)
- `Services/` — `CartService`, `FinalOrderService` (implements `IOrderService`), `DiningTableService`, `PricingService` (singleton — stateless pricing math), `CurrentUserAccessor`
- `Entities/` — `Cart`, `Order`, `DiningTable` (EF entities, tenant-scoped via `Common.Library`'s `TenantEfRepository<T>`, registered in `Program.cs`)
- `StateMachines/OrderStateMachine.cs` — the MassTransit saga (see root CLAUDE.md for the event sequence). Persisted via `OrderStateDbContext` (a `SagaDbContext`, distinct from plain `DbContext` — MassTransit's EF saga repository requires that base class)
- `Consumers/` — `PaymentSucceededConsumer`, `PaymentFailedConsumer`, `InventoryReserveFaultedConsumer`. These update the `Order` entity directly; they are **not** saga event handlers, so don't assume saga state and order-entity state change atomically
- `Projections/PosReadModelProjector.cs` — consumes catalog's `MenuItem*`/`InventoryItem*` events, maintains `PosCatalogItem` rows in `OrderDbContext` via raw upsert SQL (not EF change-tracking) so concurrent menu/inventory updates fold correctly into one `IsAvailable` flag
- `Data/` — two DbContexts against the same Postgres connection: `OrderDbContext` (carts/orders/tables/POS read model, tenant-scoped via `UseTenantModelCache()`) and `OrderStateDbContext` (saga state only, not tenant-scoped)
- `Hubs/FloorHub.cs` + `Extensions/TableModulesExtensions.cs` — SignalR for real-time table/floor status; `FloorGroups.cs` defines the group-naming convention for tenant-scoped broadcast
- `Pricing/Contracts.cs` — pricing calculation contracts consumed by `PricingService`
- `Auth/OrderPolicyExtensions.cs` — `AddOrderPolicies()`, registered alongside `AddPosJwtBearer()` in `Program.cs`
- `Mappers/` — hand-written entity↔DTO mapping (no AutoMapper)
- `Middleware/GlobalExceptionMiddleware.cs` + `Exceptions/DomainExceptions.cs` — domain exceptions are translated to HTTP responses here; throw a domain exception rather than returning ad-hoc error results from controllers

## Gotchas
- Two DbContexts, one Postgres connection: adding a migration means picking the right `*DbContextFactory` (`OrderDbContextFactory` vs `OrderStateDbContextFactory`) for `dotnet ef migrations add`.
- The saga (`OrderStateDbContext`) is deliberately **not** tenant-scoped the same way `OrderDbContext` is — don't add `UseTenantModelCache()` there without checking why it was left off.
- Payment and inventory-reservation outcomes reach the `Order` entity through `Consumers/`, not through saga transitions — if an order's status looks wrong after a payment event, check the consumer, not the state machine.
