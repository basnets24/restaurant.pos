# Restaurant POS Services

Minimal docs and quick links f## Docker Deployment

### Quick Start
Run the complete Restaurant POS system with Docker Compose:

```bash
# Set up environment variables
export GH_OWNER=your-github-username
export GH_PAT=your-github-personal-access-token

# Start infrastructure + all services
docker-compose --env-file .env -f infra/docker-compose.yml -f docker-compose.yml up --build

# Start in background (detached mode)
docker-compose --env-file .env -f infra/docker-compose.yml -f docker-compose.yml up --build -d

# Stop all services
docker-compose --env-file .env -f infra/docker-compose.yml -f docker-compose.yml down

# Stop and remove volumes (clean slate)
docker-compose --env-file .env -f infra/docker-compose.yml -f docker-compose.yml down -v
```

### Infrastructure Only
To run just the infrastructure services (PostgreSQL, MongoDB, RabbitMQ, Seq):

```bash
# Start infrastructure services
docker-compose --env-file .env -f infra/docker-compose.yml up -d

# Stop infrastructure services
docker-compose --env-file .env -f infra/docker-compose.yml down
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
  docs: [shared/common.library/README.md](./shared/common.library/README.md)
  
- Tenant.Domain — EF Core domain + DbContext for tenant data  
  docs: [shared/tenant.domain/README.md](./shared/tenant.domain/README.md)

- Messaging.Contracts — shared event contracts used by all services  
  docs: [shared/messaging.contracts/README.md](./shared/messaging.contracts/README.md)

### Automatic Package Publishing
Packages are automatically published to GitHub Packages when you push changes to shared libraries:

**How it works:**
1. **Edit version** in the library's `.csproj` file (e.g., `<Version>1.0.7</Version>`)
2. **Commit and push** changes to `dev` or `main` branch
3. **GitHub Actions** automatically builds and publishes the updated package

**Triggers:**
- `shared/Messaging.Contracts/**` → publishes Messaging.Contracts  
- `shared/common.library/**` → publishes Common.Library
- `shared/tenant.domain/**` → publishes Tenant.Domain

**Manual workflow:** You can also trigger publishing via GitHub Actions UI if needed.

## Consuming Packages
**Prerequisites:** You need a GitHub Personal Access Token (PAT) with `read:packages` scope.

**Setup (one-time):**
```bash
# Set your GitHub PAT as environment variable
export GH_PAT=your_personal_access_token_here

# Add to your shell profile to persist
echo 'export GH_PAT=your_personal_access_token_here' >> ~/.zshrc
```

**Authentication is configured** in `NuGet.config` to use the `%GH_PAT%` environment variable.

**To use updated packages:**
1. **Update version** in your service's `.csproj`:
   ```xml
   <PackageReference Include="Messaging.Contracts" Version="1.0.6" />
   ```
2. **Restore packages**:
   ```bash
   dotnet restore
   ```
3. **Clear cache** if needed:
   ```bash
   dotnet nuget locals all --clear
   ```

**Current Versions:**
- Messaging.Contracts: 1.0.6
- Common.Library: 1.0.13  
- Tenant.Domain: 1.0.1

**Troubleshooting:**
- **401 Unauthorized**: Check that `GH_PAT` environment variable is set correctly
- **Missing types**: Clear NuGet cache and restore: `dotnet nuget locals all --clear && dotnet restore`
- **Package not found**: Verify the package was published successfully in GitHub Actions


---

License: Proprietary (internal project).
