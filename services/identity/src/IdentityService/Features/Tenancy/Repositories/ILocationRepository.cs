using Common.Library.PostgreSQL;
using Tenant.Domain.Entities;

namespace IdentityService.Features.Tenancy.Repositories;

/// <summary>
/// Repository for location data access operations.
/// </summary>
public interface ILocationRepository : IEfRepository<Location>
{
    /// <summary>Get all locations for a restaurant.</summary>
    Task<IReadOnlyList<Location>> GetByRestaurantAsync(
        string restaurantId,
        CancellationToken ct = default);

    /// <summary>Get active locations for a restaurant.</summary>
    Task<IReadOnlyList<Location>> GetActiveByRestaurantAsync(
        string restaurantId,
        CancellationToken ct = default);

    /// <summary>Check if location name is unique for a restaurant.</summary>
    Task<bool> IsNameUniqueAsync(
        string restaurantId,
        string name,
        string? excludeId = null,
        CancellationToken ct = default);
}
