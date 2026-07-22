using CatalogService.Entities;
using Common.Library.PostgreSQL;
using Common.Library.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace CatalogService.Data;

public class CatalogDbContext : DbContext
{
    private readonly ITenantContext _tenant;

    public CatalogDbContext(DbContextOptions<CatalogDbContext> options, ITenantContext tenant) : base(options)
    {
        _tenant = tenant;
    }

    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("catalog");

        modelBuilder.Entity<MenuItem>(b =>
        {
            b.HasKey(m => m.Id);
            b.HasIndex(m => new { m.RestaurantId, m.LocationId });
        });

        // No FK to MenuItem.Id here: MenuItemsController.DeleteAsync deletes
        // the MenuItem first, then the linked InventoryItem as a separate
        // step (a leftover from the pre-merge Mongo design, where this
        // couldn't be enforced relationally at all) - a Restrict FK would
        // break that ordering, and Mongo never enforced this either.
        modelBuilder.Entity<InventoryItem>(b =>
        {
            b.HasKey(i => i.Id);
            b.HasIndex(i => new { i.RestaurantId, i.LocationId });
        });

        modelBuilder.ApplyTenantQueryFilters(_tenant);
    }
}
