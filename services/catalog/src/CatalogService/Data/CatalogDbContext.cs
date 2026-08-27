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
    public DbSet<ModifierGroup> ModifierGroups => Set<ModifierGroup>();
    public DbSet<ModifierOption> ModifierOptions => Set<ModifierOption>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("catalog");

        modelBuilder.Entity<MenuItem>(b =>
        {
            b.HasKey(m => m.Id);
            b.HasIndex(m => new { m.RestaurantId, m.LocationId });
        });

        modelBuilder.Entity<ModifierGroup>(b =>
        {
            b.HasKey(g => g.Id);
            b.Property(g => g.Name).IsRequired().HasMaxLength(100);
            // Stored as text rather than an int so the column stays readable in psql and a
            // reordered enum can't silently remap existing rows.
            b.Property(g => g.SelectionType).HasConversion<string>().HasMaxLength(16);
            b.HasIndex(g => new { g.RestaurantId, g.LocationId, g.MenuItemId });

            b.HasMany(g => g.Options)
                .WithOne(o => o.Group!)
                .HasForeignKey(o => o.ModifierGroupId)
                .OnDelete(DeleteBehavior.Cascade);

            // FK to the owning item, without a navigation on either side: deleting a menu
            // item must take its modifier groups with it, but a navigation would drag
            // MenuItem's tenant query filter into every ModifierGroup query.
            b.HasOne<MenuItem>()
                .WithMany()
                .HasForeignKey(g => g.MenuItemId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ModifierOption>(b =>
        {
            b.HasKey(o => o.Id);
            b.Property(o => o.Name).IsRequired().HasMaxLength(100);
            b.Property(o => o.PriceDelta).HasPrecision(10, 2);
            b.HasIndex(o => o.ModifierGroupId);
        });

        // Applies to ModifierGroup (ITenantEntity) but deliberately not to ModifierOption,
        // which is only ever reached through its parent group.
        modelBuilder.ApplyTenantQueryFilters(_tenant);
    }
}
