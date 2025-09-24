# Restaurant POS Services

Minimal docs and quick links for core backend services in this repository.

## Services

- Identity Service — authentication + Duende IdentityServer
  - docs: [services/identity/src/IdentityService/README.md](./services/identity/src/IdentityService/README.md)

- Tenant Service — restaurant onboarding, membership, tenant claims API
  - docs: [services/tenant/src/TenantService/README.md](./services/tenant/src/TenantService/README.md)

- Menu Service — tenant‑aware menu CRUD, events, inventory sync
  - docs: [services/menu/src/MenuService/README.md](./services/menu/src/MenuService/README.md)

- Inventory Service — stock tracking, reserve/release workflow, events
  - docs: [services/inventory/src/InventoryService/README.md](./services/inventory/src/InventoryService/README.md)

- Order Service — carts, orders, dining tables, pricing, SignalR
  - docs: [services/order/src/OrderService/README.md](./services/order/src/OrderService/README.md)

- Payment Service — Stripe Checkout sessions, webhooks, payment status
  - docs: [services/payment/PaymentService/README.md](./services/payment/PaymentService/README.md)

## Shared Libraries

- Play.Common (Common.Library) — logging, tenancy, MongoDB repo, MassTransit, identity helpers
  - docs: [shared/common.library/README.md](./shared/common.library/README.md)
  
- Tenant.Domain — EF Core domain + DbContext for tenant data
  - docs: [shared/tenant.domain/README.md](./shared/tenant.domain/README.md)

- Messaging.Contracts — shared event contracts used by all services
  - docs: [shared/messaging.contracts/README.md](./shared/messaging.contracts/README.md)

## Consuming lib packages
  1. Add your GitHub NuGet source(one time) and credentials to `NuGet.config` or via CLI.

      dotnet nuget add source "https://nuget.pkg.github.com/<YOUR_GH_USERNAME>/index.json" \
      --name "github" \
      --username "<YOUR_GH_USERNAME>" \
      --password "<YOUR_PAT_with_read:packages>" \
      --store-password-in-clear-text

  2. Reference the package in your `.csproj` or dotnet add package Common.Library  --version 1.0.*:
      ```xml
      <ItemGroup>
        <PackageReference Include="Common.Library" Version="1.0.*" />
      </ItemGroup>
      ```




## Local Dev Notes

- Most services expect JWT validation with `ServiceSettings:Authority`.
- Frontend origin(s) must be listed under each service’s `Cors:AllowedOrigins`.
- MongoDB, RabbitMQ, and PostgreSQL settings are configured per service.

---

License: Proprietary (internal project).
