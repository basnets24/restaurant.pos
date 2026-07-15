using Common.Library.PostgreSQL;
using Microsoft.EntityFrameworkCore;
using Tenant.Domain.Data;
using Tenant.Domain.Entities;

namespace IdentityService.Features.Tenancy.Repositories;

public class LocationRepository : EfRepository<Location>, ILocationRepository
{
    private readonly TenantDbContext _tenantDb;

    public LocationRepository(TenantDbContext context) : base(context)
    {
        _tenantDb = context ?? throw new ArgumentNullException(nameof(context));
    }

    public async Task<IReadOnlyList<Location>> GetByRestaurantAsync(
        string restaurantId,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(restaurantId);

        return await DbSet
            .AsNoTracking()
            .Where(l => l.RestaurantId == restaurantId)
            .OrderBy(l => l.Name)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Location>> GetActiveByRestaurantAsync(
        string restaurantId,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(restaurantId);

        return await DbSet
            .AsNoTracking()
            .Where(l => l.RestaurantId == restaurantId && l.IsActive)
            .OrderBy(l => l.Name)
            .ToListAsync(ct);
    }

    public async Task<bool> IsNameUniqueAsync(
        string restaurantId,
        string name,
        string? excludeId = null,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(restaurantId);
        ArgumentNullException.ThrowIfNull(name);

        var exists = await DbSet.AsNoTracking()
            .Where(l => l.RestaurantId == restaurantId &&
                        l.Name == name &&
                        (excludeId == null || l.Id != excludeId))
            .AnyAsync(ct);

        return !exists;
    }
}
