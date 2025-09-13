# Restaurant POS Services

Minimal docs and quick links for core backend services in this repository.

## Services

- Identity Service — authentication + Duende IdentityServer
  - docs: services/identity/src/IdentityService/README.md

- Tenant Service — restaurant onboarding, membership, tenant claims API
  - docs: tenant/src/TenantService/README.md

- Menu Service — tenant‑aware menu CRUD, events, inventory sync
  - docs: menu/src/MenuService/README.md

- Inventory Service — stock tracking, reserve/release workflow, events
  - docs: inventory/src/InventoryService/README.md

- Order Service — carts, orders, dining tables, pricing, SignalR
  - docs: order/src/OrderService/README.md

- Payment Service — Stripe Checkout sessions, webhooks, payment status
  - docs: payment/PaymentService/README.md

## Shared Libraries

- Play.Common (Common.Library) — logging, tenancy, MongoDB repo, MassTransit, identity helpers
  - docs: shared/common.library/README.md
  
- Tenant.Domain — EF Core domain + DbContext for tenant data
  - docs: shared/tenant.domain/README.md

- Messaging.Contracts — shared event contracts used by all services
  - docs: shared/messaging.contracts/README.md

## Local Dev Notes

- Most services expect JWT validation with `ServiceSettings:Authority`.
- Frontend origin(s) must be listed under each service’s `Cors:AllowedOrigins`.
- MongoDB, RabbitMQ, and PostgreSQL settings are configured per service.

---

License: Proprietary (internal project).
