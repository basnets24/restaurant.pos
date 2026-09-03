# CLAUDE.md — Order Service

Guidance for Claude Code in `services/order`. See the repo-root [`CLAUDE.md`](../../CLAUDE.md) for cross-service architecture (multi-tenancy, shared packages, saga overview) — this file covers only what's specific to this service.

## Commands
```bash
dotnet build services/order/src/OrderService/OrderService.csproj
dotnet run --project services/order/src/OrderService/OrderService.csproj --urls "https://localhost:7288;http://localhost:5236"
```
No dedicated test project for this service — the only test project in the repo is `services/identity/tests/IdentityService.Tests`.

## What this service owns
Cart → order → dining-table management, the order saga, and the cross-service POS read model. The busiest consumer/producer in the event graph — it both drives the saga and projects catalog/payment events into a local read model.

## Structure (`src/OrderService/`)
- `Controllers/` — `CartController`, `OrderController`, `TableController`, `NotificationsController` (thin, delegate to `Services/`)
- `Services/` — `CartService`, `FinalOrderService` (implements `IOrderService`), `DinerOrderService` (behind `DinerController`), `DiningTableService`, `PricingService` (stateless singleton), `NotificationService`, `CurrentUserAccessor`, `CustomerOrderHistoryService`/`CustomerNotificationService` (see Gotchas), `AbandonedOrderSweeper` (hosted service, see Gotchas), `Catalog/CatalogMenuClient` (resolves modifier prices from the local `PosCatalogItem` projection, no cross-service call) and `Tenancy/TenantDirectoryClient` (the service's one remaining synchronous cross-service call, to identity for restaurant display names)
- `Entities/` — `Cart`, `Order`, `DiningTable`, `Notification` (tenant-scoped via `Common.Library`'s `TenantEfRepository<T>`), plus `CustomerOrderSummary`/`CustomerNotification`, which are **not** tenant-scoped and have no repository (see Gotchas)
- `StateMachines/OrderStateMachine.cs` — the MassTransit saga (event sequence in root CLAUDE.md). Persisted via `OrderStateDbContext`, a `SagaDbContext` distinct from plain `DbContext` — MassTransit's EF saga repository requires that base class
- `Consumers/` — `PaymentSucceededConsumer`, `PaymentFailedConsumer`, `InventoryReserveFaultedConsumer`. Update `Order` directly, are **not** saga event handlers — don't assume saga state and order-entity state change atomically
- `Projections/PosReadModelProjector.cs` — consumes catalog's `MenuItem*`/`InventoryItem*`/`MenuItemModifiersChanged` events, maintains `PosCatalogItem` rows via raw upsert SQL, not EF change-tracking, so concurrent updates fold correctly into one `IsAvailable` flag. `MenuItemModifiersChanged` folds into `PosCatalogItem.Modifiers` (jsonb) the same way, always the full current set, never a delta
- `Data/` — two DbContexts, one Postgres connection: `OrderDbContext` (carts/orders/tables/POS read model, tenant-scoped via `UseTenantModelCache()`) and `OrderStateDbContext` (saga state only, not tenant-scoped)
- `Hubs/FloorHub.cs` + `Extensions/TableModulesExtensions.cs` — SignalR for real-time table/floor status; `FloorGroups.cs` defines the group-naming convention
- `Pricing/Contracts.cs` — pricing calculation contracts consumed by `PricingService`
- `Auth/OrderPolicyExtensions.cs` — `AddOrderPolicies()`, registered alongside `AddPosJwtBearer()` in `Program.cs`
- `Mappers/` — hand-written entity↔DTO mapping, no AutoMapper
- `Middleware/GlobalExceptionMiddleware.cs` + `Exceptions/DomainExceptions.cs` — throw a domain exception rather than returning ad-hoc error results from controllers

## Gotchas
- Two DbContexts, one connection: adding a migration means picking the right `*DbContextFactory` (`OrderDbContextFactory` vs `OrderStateDbContextFactory`) for `dotnet ef migrations add`.
- The saga (`OrderStateDbContext`) is deliberately **not** tenant-scoped like `OrderDbContext` — don't add `UseTenantModelCache()` there without checking why it was left off.
- Payment and inventory-reservation outcomes reach `Order` through `Consumers/`, not saga transitions — if status looks wrong after a payment event, check the consumer, not the state machine.
- `FinalOrderService.CancelAsync` is the **only** publisher of `ReleaseInventory`; keep it that way. Three callers: `POST /orders/{id}/cancel` (staff), `POST /diner/orders/{id}/cancel` (diner's own unpaid order), and `AbandonedOrderSweeper`.
- `CatalogMenuClient` resolves modifier prices from `IRepository<PosCatalogItem>`, not catalog directly — reads whatever `PosReadModelProjector` last folded. If a staff modifier edit doesn't show up in a diner's price, check the projector consumed the event, not this class.
- `AbandonedOrderSweeper` cancels **pickup** orders left unpaid past `AbandonedOrders:Ttl`. Dine-in is exempt, a table order legitimately sits unpaid. It runs outside `TenantMiddleware`, so it sets the tenant holder itself per group; and it only cancels orders whose saga reached `Confirmed`, since an order is `Pending` both before and after reservation, and cancelling one that never reserved would release stock nobody took.
- `CustomerOrderSummary` is the one table here **not** tenant-scoped, since a diner's order history spans restaurants. No `TenantEfRepository` registration; `CustomerOrderHistoryService` writes it through `OrderDbContext` directly, deliberately. Written inline from the order lifecycle rather than projected, both ends would be this service. Restaurant/location names are snapshotted via `TenantDirectoryClient`, best-effort, never fails an order.
- **Two notification subsystems.** `Notification`/`NotificationService` address staff: tenant-scoped, persisted, pushed live to the SignalR floor group. `CustomerNotification`/`CustomerNotificationService` address the diner: not tenant-scoped, poll-only, read through `/diner/notifications`. Separate type constants (`NotificationType` vs `CustomerNotificationType`), nothing valid in both. Customer notifications raise from `InventoryReservedConsumer`, `InventoryReserveFaultedConsumer`, `PaymentFailedConsumer`, and `FinalOrderService.MarkPaidAsync`/`CancelAsync`. `NotifyAsync` no-ops for an order with no `CustomerId`.
- `IOrderService.CancelAsync`'s `reason` becomes the **diner-facing** cancellation notification body — the sweep sets it so a timeout doesn't read as the restaurant refusing. Don't put staff-worded text in it.
- Don't format currency server-side. The frontend's `money()` owns the app's one currency assumption; `:C` renders in the server host's culture, not the diner's.
- Cart checkout is "Fire to Kitchen" in the UI and commits the order; payment is a separate later call. Checkout ≠ paid.
