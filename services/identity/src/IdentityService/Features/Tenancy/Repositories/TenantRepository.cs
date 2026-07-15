using Common.Library.PostgreSQL;
using Microsoft.EntityFrameworkCore;
using Tenant.Domain.Data;
using Tenant.Domain.Entities;

namespace IdentityService.Features.Tenancy.Repositories;

public class TenantRepository : EfRepository<Restaurant>, ITenantRepository
{
    private readonly TenantDbContext _tenantDb;

    public TenantRepository(TenantDbContext context) : base(context)
    {
        _tenantDb = context ?? throw new ArgumentNullException(nameof(context));
    }

    public async Task<IReadOnlyList<Restaurant>> GetUserRestaurantsAsync(
        Guid userId,
        CancellationToken ct = default)
    {
        var restaurantIds = await _tenantDb.RestaurantMemberships
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .Select(m => m.RestaurantId)
            .Distinct()
            .ToListAsync(ct);

        if (restaurantIds.Count == 0)
            return new List<Restaurant>();

        return await DbSet
            .AsNoTracking()
            .Where(r => restaurantIds.Contains(r.Id))
            .OrderBy(r => r.Name)
            .ToListAsync(ct);
    }

    public async Task<Restaurant?> GetBySlugAsync(
        string slug,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(slug);

        return await DbSet
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Slug == slug, ct);
    }

    public async Task<bool> IsNameUniqueAsync(
        string name,
        string? excludeId = null,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(name);

        var exists = await DbSet.AsNoTracking()
            .Where(r => r.Name == name && (excludeId == null || r.Id != excludeId))
            .AnyAsync(ct);

        return !exists;
    }
}
