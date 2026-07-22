using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace OrderService.Data;

/// <summary>
/// Design-time factory so `dotnet ef migrations` can build <see cref="OrderStateDbContext"/>
/// without a running host. The connection string here is never opened during
/// `migrations add` - only a real runtime host (DI-configured via appsettings) connects.
/// </summary>
public class OrderStateDbContextFactory : IDesignTimeDbContextFactory<OrderStateDbContext>
{
    public OrderStateDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<OrderStateDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=identity_db;Username=postgres;Password=postgres");
        return new OrderStateDbContext(optionsBuilder.Options);
    }
}
