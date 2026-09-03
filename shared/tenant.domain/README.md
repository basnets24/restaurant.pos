# Tenant.Domain

Shared EF Core domain for multi-tenant data: `DbContext`, entities, and schema conventions for restaurants, locations, memberships, and tenant roles. Currently consumed by **identity** only — it's the service that owns tenant/membership data directly (no separate tenant service).

## Installation

```xml
<ItemGroup>
  <PackageReference Include="Tenant.Domain" Version="2.*" />
</ItemGroup>
```

Or as a project reference for local development:

```xml
<ItemGroup>
  <ProjectReference Include="..\..\..\shared\tenant.domain\Tenant.Domain.csproj" />
</ItemGroup>
```

## Contents

**`Tenant.Domain.Data.TenantDbContext`** — default schema `tenant`; indexes and relationships configured in `OnModelCreating`.

| Entity (`Tenant.Domain.Entities`) | Table | What it is |
|---|---|---|
| `Restaurant` | `tenant.Tenants` | The tenant itself |
| `Location` | `tenant.TenantLocations` | A restaurant's physical locations |
| `RestaurantMembership` | `tenant.RestaurantMemberships` | User ↔ restaurant associations |
| `RestaurantUserRole` | `tenant.RestaurantUserRoles` | Role assignments per tenant |

`TenantRoles` (`Tenant.Domain.Constants`) — predefined role constants for authorization.

## Usage

### 1. Register DbContext in your service

```csharp
using Tenant.Domain.Data;
using Microsoft.EntityFrameworkCore;

var pg = builder.Configuration.GetSection("PostgresSettings").Get<PostgresSettings>();
builder.Services.AddDbContext<TenantDbContext>(o => o.UseNpgsql(pg!.GetConnectionString()));
```

### 2. Apply migrations in your host service

**Note**: This library does not ship migrations - you need to generate them in your consuming service.

```bash
# Generate migration
dotnet ef migrations add InitTenantSchema -s <YourService>.csproj -p shared/tenant.domain/Tenant.Domain.csproj

# Apply to database
dotnet ef database update -s <YourService>.csproj -p shared/tenant.domain/Tenant.Domain.csproj
```

### 3. Query from your controllers/services

```csharp
using Tenant.Domain.Data;
using Tenant.Domain.Entities;

public class RestaurantService
{
    private readonly TenantDbContext _context;
    
    public RestaurantService(TenantDbContext context) => _context = context;
    
    public async Task<Restaurant?> GetRestaurantAsync(string restaurantId) =>
        await _context.Restaurants.FirstOrDefaultAsync(r => r.Id == restaurantId);

    public async Task<List<Location>> GetLocationsAsync(string restaurantId) =>
        // No navigation property between Restaurant and Location - it's a plain
        // RestaurantId foreign key, query Locations directly.
        await _context.Locations.Where(l => l.RestaurantId == restaurantId).ToListAsync();
}
```

## Publishing

`.github/workflows/publish-tenant-domain.yml` packs and pushes on any push to `dev` or `main` that touches `shared/tenant.domain/**` (also triggerable manually via `gh workflow run publish-tenant-domain.yml`). **It does not bump the version for you** — `--skip-duplicate` means pushing without bumping `<Version>` in the `.csproj` first just silently no-ops rather than publishing. Bump it yourself before you push.

Local dry run, no publish:
```bash
dotnet pack shared/tenant.domain/Tenant.Domain.csproj -c Release -p:PackageVersion=2.1.2 -o ./packages
```

## Data Model Notes
- **Unique constraints**: one membership per user/restaurant; one role assignment per (user, restaurant, roleName)
- **String IDs**: restaurant and location use 32-char strings for simple slugs/IDs
- **Schema separation**: every table lives in the `tenant` schema
- **No seeding**: role seeding is intentionally left to consuming services

## Versioning

- **Patch** (1.0.x): Bug fixes, documentation updates
- **Minor** (1.x.0): Backward-compatible schema changes (new optional columns)
- **Major** (x.0.0): Breaking schema changes (migrations required) - will be called out in release notes

## Development Notes

When extending this domain:

1. Follow existing naming conventions (`tenant.TableName`)
2. Use appropriate indexes for query patterns
3. Consider multi-tenancy implications in all entity designs
4. Maintain backward compatibility when possible
5. Document any required migration steps

Namespaces live under `Tenant.Domain.*`.
