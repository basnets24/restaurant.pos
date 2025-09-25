# Restaurant POS Services

Minimal docs and quick links f## Docker Deployment

### Quick Start
Run the complete Restaurant POS system with Docker Compose:

```bash
# Set up environment variables
export GH_OWNER=your-github-username
export GH_PAT=your-github-personal-access-token

# Start infrastructure + all services
docker-compose -f infra/docker-compose.yml -f docker-compose.yml up --build
```

### Access Points
- **Frontend**: http://localhost:5173
- **Identity Service**: http://localhost:5265
- **Tenant Service**: http://localhost:5200
- **Menu Service**: http://localhost:5062
- **Inventory Service**: http://localhost:5094
- **Order Service**: http://localhost:5236
- **Payment Service**: http://localhost:5238

### Prerequisites
1. **GitHub Personal Access Token** with `read:packages` permission for private NuGet packages
2. **Docker** and **Docker Compose** installed
3. **Environment variables** configured (GH_OWNER, GH_PAT)

### Infrastructure Services
The system includes containerized infrastructure:
- **PostgreSQL** (identity & tenant data)
- **MongoDB** (business domain data)
- **RabbitMQ** (inter-service messaging)
- **Seq** (centralized logging)

### Architecture
- **Network**: All services communicate via `pos-net` Docker network
- **Dependencies**: Services start in proper order with health checks
- **Security**: Non-root containers, environment-based secrets
- **Databases**: PostgreSQL for identity/tenant, MongoDB for menu/inventory/order/payment

For detailed Docker documentation, see [DOCKER.md](./DOCKER.md).

## Local Dev Notes

- Most services expect JWT validation with `ServiceSettings:Authority`.
- Frontend origin(s) must be listed under each service's `Cors:AllowedOrigins`.
- MongoDB, RabbitMQ, and PostgreSQL settings are configured per service.

--- backend services in this repository.

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
  - publish: `git tag common.library-v<version> && git push origin common.library-v<version>`
  
- Tenant.Domain — EF Core domain + DbContext for tenant data
  - docs: [shared/tenant.domain/README.md](./shared/tenant.domain/README.md)
  - publish: `git tag tenant.domain-v<version> && git push origin tenant.domain-v<version>`

- Messaging.Contracts — shared event contracts used by all services
  - docs: [shared/messaging.contracts/README.md](./shared/messaging.contracts/README.md)
  - publish: `git tag messaging.contracts-v<version> && git push origin messaging.contracts-v<version>`

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


---

License: Proprietary (internal project).
