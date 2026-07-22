using Common.Library.PostgreSQL;
using Common.Library.Tenancy;
using Microsoft.EntityFrameworkCore;
using PaymentService.Entities;

namespace PaymentService.Data;

public class PaymentDbContext : DbContext, ITenantScopedDbContext
{
    private readonly ITenantContext _tenant;

    public PaymentDbContext(DbContextOptions<PaymentDbContext> options, ITenantContext tenant)
        : base(options)
    {
        _tenant = tenant;
    }

    ITenantContext ITenantScopedDbContext.Tenant => _tenant;

    public DbSet<Payment> Payments => Set<Payment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasDefaultSchema("payment");

        modelBuilder.Entity<Payment>(b =>
        {
            b.HasKey(p => p.Id);
            b.HasIndex(p => new { p.RestaurantId, p.LocationId });
        });

        modelBuilder.ApplyTenantQueryFilters(_tenant);
    }
}
