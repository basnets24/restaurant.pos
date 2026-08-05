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
    public DbSet<Notification> Notifications => Set<Notification>();

    /// <summary>Neither of these is tenant-scoped, unlike everything above them. See the
    /// entities.</summary>
    public DbSet<CustomerOrderSummary> CustomerOrderSummaries => Set<CustomerOrderSummary>();
    public DbSet<CustomerNotification> CustomerNotifications => Set<CustomerNotification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("order");

        modelBuilder.Entity<Cart>(b =>
        {
            b.HasKey(c => c.Id);
            b.HasIndex(c => new { c.RestaurantId, c.LocationId });
            // Explicit default so rows that predate the column read as DineIn rather than "",
            // which is what EF would otherwise backfill a non-nullable string column with.
            b.Property(c => c.OrderType).HasDefaultValue(OrderTypes.DineIn);
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

        modelBuilder.Entity<Notification>(b =>
        {
            b.HasKey(n => n.Id);
            b.HasIndex(n => new { n.RestaurantId, n.LocationId, n.CreatedAt });
        });

        modelBuilder.Entity<PosCatalogItem>(b =>
        {
            b.HasKey(p => p.Id);
            b.HasIndex(p => new { p.RestaurantId, p.LocationId });
            b.HasIndex(p => new { p.RestaurantId, p.LocationId, p.IsAvailable });
            b.HasIndex(p => new { p.RestaurantId, p.LocationId, p.Category, p.Name });

            // Raw-SQL upserts (PosReadModelProjector) that don't know about modifiers omit this
            // column entirely rather than writing an explicit '[]' - the DB default covers them.
            b.Property(p => p.Modifiers)
                .HasConversion(JsonConverters.ListConverter<PosModifierGroup>())
                .Metadata.SetValueComparer(JsonConverters.ListComparer<PosModifierGroup>());
            b.Property(p => p.Modifiers)
                .HasColumnType("jsonb")
                .HasDefaultValueSql("'[]'::jsonb")
                .IsRequired();
        });

        modelBuilder.Entity<CustomerOrderSummary>(b =>
        {
            b.HasKey(s => s.Id);
            // The only way this table is ever queried: one customer, newest first. Note there
            // is deliberately no (RestaurantId, LocationId) index - nothing reads it that way,
            // and one would invite exactly the tenant-scoped query this table exists to avoid.
            b.HasIndex(s => new { s.CustomerId, s.CreatedAt });
        });

        modelBuilder.Entity<CustomerNotification>(b =>
        {
            b.HasKey(n => n.Id);
            // Same shape of read as the summaries above, and the same deliberate absence of a
            // tenant index.
            b.HasIndex(n => new { n.CustomerId, n.CreatedAt });
        });

        modelBuilder.Entity<Order>(b =>
        {
            b.HasKey(o => o.Id);
            b.HasIndex(o => new { o.RestaurantId, o.LocationId });

            // A diner only ever queries their own orders, so every read on that path
            // carries a CustomerId predicate on top of the tenant filter.
            b.HasIndex(o => new { o.RestaurantId, o.LocationId, o.CustomerId });

            // See the matching comment on Cart.OrderType.
            b.Property(o => o.OrderType).HasDefaultValue(OrderTypes.DineIn);

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
