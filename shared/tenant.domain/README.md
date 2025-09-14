# Tenant.Domain

Shared EF Core domain for multi‑tenant data used across services. Provides DbContext, entities, and schema conventions for restaurants, locations, memberships, and tenant roles.

## Contents
- DbContext: `Tenant.Domain.Data.TenantDbContext`
  - Default schema: `tenant`
  - Entities: `Restaurant`, `Location`, `RestaurantMembership`, `RestaurantUserRole`
  - Indexes and relationships configured in `OnModelCreating`
- Entities: under `Tenant.Domain.Entities`
  - `Restaurant` stored as `tenant.Tenants`
  - `Location` stored as `tenant.TenantLocations`
  - `RestaurantMembership`, `RestaurantUserRole`
- Roles constants: `TenantRoles`

## Installation

Reference from your service or publish as a package:

```xml
<ItemGroup>
  <ProjectReference Include="..\..\..\shared\tenant.domain\Tenant.Domain.csproj" />
</ItemGroup>
```

Or (when published):
```xml
<ItemGroup>
  <PackageReference Include="Tenant.Domain" Version="1.0.*" />
</ItemGroup>
```

## Usage

- Register the DbContext in your service:
```csharp
using Tenant.Domain.Data;
using Microsoft.EntityFrameworkCore;

var pg = builder.Configuration.GetSection("PostgresSettings").Get<PostgresSettings>();
builder.Services.AddDbContext<TenantDbContext>(o => o.UseNpgsql(pg!.GetConnectionString()));
```

- Apply migrations in your host service (this library does not ship migrations):
```bash
dotnet ef migrations add InitTenantSchema -s <YourService>.csproj -p shared/tenant.domain/Tenant.Domain.csproj
dotnet ef database update -s <YourService>.csproj -p shared/tenant.domain/Tenant.Domain.csproj
```

- Query from your controllers/services as needed. Example indexes:
  - Unique membership per user/restaurant
  - Unique user role per (user, restaurant, roleName)

## Notes
- IDs for restaurant and location use 32‑char strings for simple slugs/IDs.
- Consider seeding roles at the service level; the domain package intentionally has no seeding.

License: Proprietary (internal project).
