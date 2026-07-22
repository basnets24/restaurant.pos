using Common.Library.PostgreSQL;
using Common.Library.Tenancy;
using Microsoft.EntityFrameworkCore;
using OrderService.Entities;
using OrderService.Pricing;
using OrderService.Projections;

namespace OrderService.Data;

public class OrderDbContext : DbContext, ITenantScopedDbContext
{
    private readonly ITenantContext _tenant;

    public OrderDbContext(DbContextOptions<OrderDbContext> options, ITenantContext tenant) : base(options)
    {
        _tenant = tenant;
    }

    ITenantContext ITenantScopedDbContext.Tenant => _tenant;

    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<DiningTable> DiningTables => Set<DiningTable>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<PosCatalogItem> PosCatalogItems => Set<PosCatalogItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("order");

        modelBuilder.Entity<Cart>(b =>
        {
            b.HasKey(c => c.Id);
            b.HasIndex(c => new { c.RestaurantId, c.LocationId });
            b.Property(c => c.Items)
                .HasConversion(JsonConverters.ListConverter<CartItem>())
                .Metadata.SetValueComparer(JsonConverters.ListComparer<CartItem>());
            b.Property(c => c.Items).HasColumnType("jsonb");
        });

        modelBuilder.Entity<DiningTable>(b =>
        {
            b.HasKey(t => t.Id);
            b.HasIndex(t => new { t.RestaurantId, t.LocationId });
        });

        modelBuilder.Entity<PosCatalogItem>(b =>
        {
            b.HasKey(p => p.Id);
            b.HasIndex(p => new { p.RestaurantId, p.LocationId });
            b.HasIndex(p => new { p.RestaurantId, p.LocationId, p.IsAvailable });
            b.HasIndex(p => new { p.RestaurantId, p.LocationId, p.Category, p.Name });
        });

        modelBuilder.Entity<Order>(b =>
        {
            b.HasKey(o => o.Id);
            b.HasIndex(o => new { o.RestaurantId, o.LocationId });

            b.Property(o => o.Items)
                .HasConversion(JsonConverters.ListConverter<OrderItem>())
                .Metadata.SetValueComparer(JsonConverters.ListComparer<OrderItem>());
            b.Property(o => o.Items).HasColumnType("jsonb");

            b.Property(o => o.AppliedDiscounts)
                .HasConversion(JsonConverters.ListConverter<AppliedDiscount>())
                .Metadata.SetValueComparer(JsonConverters.ListComparer<AppliedDiscount>());
            b.Property(o => o.AppliedDiscounts).HasColumnType("jsonb");

            b.Property(o => o.AppliedTaxes)
                .HasConversion(JsonConverters.ListConverter<AppliedTax>())
                .Metadata.SetValueComparer(JsonConverters.ListComparer<AppliedTax>());
            b.Property(o => o.AppliedTaxes).HasColumnType("jsonb");

            b.Property(o => o.ServiceCharges)
                .HasConversion(JsonConverters.ListConverter<ServiceCharge>())
                .Metadata.SetValueComparer(JsonConverters.ListComparer<ServiceCharge>());
            b.Property(o => o.ServiceCharges).HasColumnType("jsonb");
        });

        modelBuilder.ApplyTenantQueryFilters(_tenant);
    }
}
