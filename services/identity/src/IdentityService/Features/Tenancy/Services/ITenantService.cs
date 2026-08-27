using IdentityService.Features.Tenancy.DTOs;
using IdentityService.Features.Shared.DTOs;

namespace IdentityService.Features.Tenancy.Services;

/// <summary>
/// Service for managing tenant/restaurant operations.
/// Handles restaurant and location management.
/// </summary>
public interface ITenantService
{
    /// <summary>Get all restaurants the user belongs to.</summary>
    Task<IReadOnlyList<TenantRestaurantDto>> GetMyTenantsAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Get restaurant details including locations.</summary>
    Task<TenantWithLocationsDto?> GetTenantAsync(string restaurantId, CancellationToken ct = default);

    /// <summary>Create a new location for a restaurant.</summary>
    Task<TenantLocationDto> CreateLocationAsync(
        Guid userId,
        string restaurantId,
        CreateLocationDto dto,
        CancellationToken ct = default);

    /// <summary>Update location details.</summary>
    Task UpdateLocationAsync(
        Guid userId,
        string restaurantId,
        string locationId,
        UpdateLocationDto dto,
        CancellationToken ct = default);

    /// <summary>Set restaurant-level diner discovery settings (cuisine).</summary>
    Task UpdateRestaurantDiscoveryAsync(
        Guid userId,
        string restaurantId,
        UpdateRestaurantDiscoveryDto dto,
        CancellationToken ct = default);

    /// <summary>Opt a location into (or out of) the public diner listings, and set what
    /// that listing shows.</summary>
    Task UpdateLocationDiscoveryAsync(
        Guid userId,
        string restaurantId,
        string locationId,
        UpdateLocationDiscoveryDto dto,
        CancellationToken ct = default);
}
