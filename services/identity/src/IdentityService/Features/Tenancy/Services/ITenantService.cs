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
}
