using Common.Library.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PaymentService.Data;

/// <summary>
/// Design-time factory so `dotnet ef migrations` can build <see cref="PaymentDbContext"/>
/// without a running host. The connection string here is never opened during
/// `migrations add` - only a real runtime host (DI-configured via appsettings) connects.
/// ITenantContext only affects query filter *expressions* at the model level, not the
/// migration SQL, so a stub value is fine here.
/// </summary>
public class PaymentDbContextFactory : IDesignTimeDbContextFactory<PaymentDbContext>
{
    public PaymentDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<PaymentDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=identity_db;Username=postgres;Password=postgres");

        var designTimeTenant = new TenantContext { RestaurantId = string.Empty, LocationId = string.Empty };
        return new PaymentDbContext(optionsBuilder.Options, designTimeTenant);
    }
}
