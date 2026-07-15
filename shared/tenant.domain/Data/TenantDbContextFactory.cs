using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Tenant.Domain.Data;

/// <summary>
/// Design-time factory so `dotnet ef migrations` can build <see cref="TenantDbContext"/>
/// directly from this project's source, without going through a consuming service's
/// DI container (which resolves this package from NuGet, not local source).
/// The connection string here is never opened during `migrations add` — only a real
/// runtime host (e.g. IdentityService's DI-configured options) connects to a database.
/// </summary>
public class TenantDbContextFactory : IDesignTimeDbContextFactory<TenantDbContext>
{
    public TenantDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<TenantDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=identity_db;Username=postgres;Password=postgres");
        return new TenantDbContext(optionsBuilder.Options);
    }
}
