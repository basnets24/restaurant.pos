using Common.Library.PostgreSQL;
using Tenant.Domain.Entities;

namespace IdentityService.Features.Tenancy.Repositories;

/// <summary>
/// Repository for restaurant/tenant data access operations.
/// </summary>
public interface ITenantRepository : IEfRepository<Restaurant>
{
    /// <summary>Get all restaurants a user belongs to.</summary>
    Task<IReadOnlyList<Restaurant>> GetUserRestaurantsAsync(
        Guid userId,
        CancellationToken ct = default);

    /// <summary>Get restaurant by slug.</summary>
    Task<Restaurant?> GetBySlugAsync(
        string slug,
        CancellationToken ct = default);

    /// <summary>Check if restaurant name is unique.</summary>
    Task<bool> IsNameUniqueAsync(
        string name,
        string? excludeId = null,
        CancellationToken ct = default);
}
