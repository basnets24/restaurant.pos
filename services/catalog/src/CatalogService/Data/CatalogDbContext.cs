using CatalogService.Entities;
using Common.Library.PostgreSQL;
using Common.Library.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace CatalogService.Data;

public class CatalogDbContext : DbContext, ITenantScopedDbContext
{
    private readonly ITenantContext _tenant;

    public CatalogDbContext(DbContextOptions<CatalogDbContext> options, ITenantContext tenant) : base(options)
    {
        _tenant = tenant;
    }

    ITenantContext ITenantScopedDbContext.Tenant => _tenant;

    public DbSet<MenuItem> MenuItems => Set<MenuItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("catalog");

        modelBuilder.Entity<MenuItem>(b =>
        {
            b.HasKey(m => m.Id);
            b.HasIndex(m => new { m.RestaurantId, m.LocationId });
        });

        modelBuilder.ApplyTenantQueryFilters(_tenant);
    }
}
