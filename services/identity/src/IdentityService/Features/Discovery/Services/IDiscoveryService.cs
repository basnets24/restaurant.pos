using IdentityService.Features.Discovery.DTOs;

namespace IdentityService.Features.Discovery.Services;

public interface IDiscoveryService
{
    Task<IReadOnlyList<DiscoveryListingDto>> SearchAsync(DiscoveryQuery query, CancellationToken ct = default);

    Task<DiscoveryListingDto?> GetAsync(string restaurantId, string locationId, CancellationToken ct = default);

    /// <summary>Distinct cuisines across discoverable listings, for the filter dropdown.</summary>
    Task<IReadOnlyList<string>> GetCuisinesAsync(CancellationToken ct = default);
}
