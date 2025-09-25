# Tenant.Domain

Shared EF Core domain for multi-tenant data used across Restaurant POS services. Provides DbContext, entities, and schema conventions for restaurants, locations, memberships, and tenant roles. This library ensures consistent tenant data modeling across all microservices in the system.

This library is consumed by services that need tenant-aware data access and can be published as a package for external reuse.

## Installation

From GitHub Packages:

1) Add your GitHub NuGet source and credentials to `NuGet.config` or via CLI.
2) Reference the package in your `.csproj`:

```xml
<ItemGroup>
  <PackageReference Include="Tenant.Domain" Version="1.0.*" />
</ItemGroup>
```

Or reference directly as a project (for development):

```xml
<ItemGroup>
  <ProjectReference Include="..\..\..\shared\tenant.domain\Tenant.Domain.csproj" />
</ItemGroup>
```

## Contents

### DbContext
- **`Tenant.Domain.Data.TenantDbContext`**
  - Default schema: `tenant`
  - Entities: `Restaurant`, `Location`, `RestaurantMembership`, `RestaurantUserRole`
  - Indexes and relationships configured in `OnModelCreating`

### Entities (under `Tenant.Domain.Entities`)
- **`Restaurant`** → stored as `tenant.Tenants`
- **`Location`** → stored as `tenant.TenantLocations`  
- **`RestaurantMembership`** → user-restaurant associations
- **`RestaurantUserRole`** → role assignments per tenant

### Constants
- **`TenantRoles`** → predefined role constants for authorization

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
    
    public async Task<Restaurant?> GetRestaurantAsync(string restaurantId)
    {
        return await _context.Restaurants
            .Include(r => r.Locations)
            .FirstOrDefaultAsync(r => r.Id == restaurantId);
    }
}
```

## Creating a Package

Tag-driven publish (CI):

```bash
git tag tenant.domain-v1.0.1
git push origin tenant.domain-v1.0.1
```

Local dry run pack:

```bash
dotnet pack shared/tenant.domain/Tenant.Domain.csproj -c Release -p:PackageVersion=1.0.1 -o ./packages
```

## Data Model Features

- **Unique Constraints**: 
  - One membership per user/restaurant combination
  - One role assignment per (user, restaurant, roleName) combination
- **String IDs**: Restaurant and location use 32-char strings for simple slugs/IDs
- **Schema Separation**: All tables use `tenant` schema for clear organization
- **No Seeding**: Role seeding is intentionally left to consuming services

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
