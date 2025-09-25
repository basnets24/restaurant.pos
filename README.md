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
  docs: [shared/common.library/README.md](./shared/common.library/README.md)
  
- Tenant.Domain — EF Core domain + DbContext for tenant data  
  docs: [shared/tenant.domain/README.md](./shared/tenant.domain/README.md)

- Messaging.Contracts — shared event contracts used by all services  
  docs: [shared/messaging.contracts/README.md](./shared/messaging.contracts/README.md)

### Manual Package Publishing (CI Removed)
Since automated publish workflows were removed, packages are published manually. Replace `<PACKAGE_ID>` and `<VERSION>` accordingly.

1. Bump version in the target `.csproj` (e.g. `<Version>1.0.3</Version>`).
2. Clean & build (optional but safer):
   ```bash
   dotnet clean shared/<folder>/<Project>.csproj
   dotnet build shared/<folder>/<Project>.csproj -c Release
   ```
3. Pack:
   ```bash
   dotnet pack shared/<folder>/<Project>.csproj -c Release -o packages
   # or explicitly set version
   dotnet pack shared/<folder>/<Project>.csproj -c Release -p:PackageVersion=<VERSION> -o packages
   ```
4. Inspect the nupkg (ensure DLL is present):
   ```bash
   unzip -l packages/<PACKAGE_ID>.<VERSION>.nupkg | grep -i lib
   ```
5. Push to GitHub Packages:
   ```bash
   dotnet nuget push packages/<PACKAGE_ID>.<VERSION>.nupkg \
     --source "https://nuget.pkg.github.com/${GH_OWNER}/index.json" \
     --api-key $GH_PAT \
     --skip-duplicate
   ```
6. Consumers update references:
   ```bash
   dotnet add <path-to-csproj> package <PACKAGE_ID> --version <VERSION>
   ```
7. Clear caches if you suspect stale DLLs:
   ```bash
   dotnet nuget locals all --clear
   ```

Common folders to substitute:
```
shared/common.library/Common.Library.csproj
shared/tenant.domain/Tenant.Domain.csproj
shared/Messaging.Contracts/Messaging.Contracts.csproj
```

Verification tip:
```bash
strings packages/Messaging.Contracts.<VERSION>.nupkg | grep -i PaymentRequested || true
```
If not found inside the dll, extract and inspect the assembly directly:
```bash
unzip -p packages/Messaging.Contracts.<VERSION>.nupkg lib/net8.0/Messaging.Contracts.dll > /tmp/Messaging.Contracts.dll
strings /tmp/Messaging.Contracts.dll | grep -i PaymentRequested
```

## Consuming lib packages
  1. Add your GitHub NuGet source (one time) and credentials to `NuGet.config` or via CLI.

      dotnet nuget add source "https://nuget.pkg.github.com/<YOUR_GH_USERNAME>/index.json" \
      --name "github" \
      --username "<YOUR_GH_USERNAME>" \
      --password "<YOUR_PAT_with_read:packages>" \
      --store-password-in-clear-text

  2. Reference the package in your `.csproj` (or use `dotnet add package`):
      ```xml
      <ItemGroup>
        <PackageReference Include="Common.Library" Version="1.0.*" />
      </ItemGroup>
      ```


---

License: Proprietary (internal project).
