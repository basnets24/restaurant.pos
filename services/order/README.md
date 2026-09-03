# OrderService (Restaurant POS)

Cart, order, and dining-room service: carts, order finalization, dining tables, pricing, notifications, real-time table updates. Owns the order saga and a cross-service POS read model. .NET 8, PostgreSQL/EF Core, MassTransit, SignalR, JWT Bearer auth.

## Features

- Tenant-scoped carts, orders, and dining tables in PostgreSQL
- Pricing engine with configurable taxes, service charges, and discounts, cart responses carry a live `estimate` so the UI never recomputes tax itself
- Persisted notifications for order/table lifecycle events, separate from the SignalR hub, which is live-only with no persistence
- Real-time table updates over SignalR
- Diner-facing ordering: checkout, cross-restaurant order history, a background sweep that cancels abandoned pickup orders, and customer-addressed notifications

## API surface

- REST APIs for carts, orders, tables, and notifications, plus a parallel diner-facing surface. Reads need `order.read`; writes need `order.write` plus an Admin/Manager/Server role. Diner routes check the `diner` scope plus ownership on every call, no role check.
- Cart checkout is **"Fire to Kitchen"**, it commits the order and reserves inventory. It does **not** take payment, that's a separate later call, except for diners, whose checkout auto-requests payment once inventory confirms.
- Cancelling an order releases its inventory reservation, and is the only way that happens. Staff can cancel any order, a diner can cancel their own unpaid one, and a background sweep auto-cancels abandoned unpaid pickup orders past a TTL. Without one of those three, an abandoned order holds its reservation indefinitely.
- A diner's order history and notifications intentionally ignore tenant headers, both span every restaurant the diner has ordered from.

## Config

`appsettings.json`, overridable via env vars or User Secrets: Postgres/RabbitMQ connections, OIDC authority, CORS origins, Seq, queue addresses, and pricing (taxes/service charges/discounts).

## Getting Started

- Needs .NET SDK 8.0+, PostgreSQL and RabbitMQ, and identity running for JWT validation.
- Normally you don't run this by hand, `./local/dev.sh` from the repo root starts everything.

```bash
dotnet run --project services/order/src/OrderService  # https://localhost:7288 / http://localhost:5236
```

---

License: Proprietary (internal project).
