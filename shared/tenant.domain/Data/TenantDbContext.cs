using Microsoft.EntityFrameworkCore;
using Tenant.Domain.Entities;

namespace Tenant.Domain.Data;

public class TenantDbContext : DbContext
{
    public TenantDbContext(DbContextOptions<TenantDbContext> options) : base(options) { }

    public DbSet<Restaurant> Restaurants => Set<Restaurant>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<RestaurantMembership> RestaurantMemberships => Set<RestaurantMembership>();
    public DbSet<RestaurantUserRole> RestaurantUserRoles => Set<RestaurantUserRole>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.HasDefaultSchema("tenant");

        b.Entity<Location>(e =>
        {
            e.HasIndex(x => new { x.RestaurantId, x.Name }).IsUnique();
            e.HasIndex(x => new { x.RestaurantId, x.IsActive });
            e.HasOne<Restaurant>().WithMany()
                .HasForeignKey(x => x.RestaurantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<RestaurantMembership>(e =>
        {
            e.HasIndex(x => new { x.UserId, x.RestaurantId }).IsUnique();
            e.HasIndex(x => x.UserId);
        });

        b.Entity<RestaurantUserRole>(e =>
        {
            e.HasIndex(x => new { x.UserId, x.RestaurantId, x.RoleName }).IsUnique();
            e.HasIndex(x => new { x.UserId, x.RestaurantId });
        });
    }
}

