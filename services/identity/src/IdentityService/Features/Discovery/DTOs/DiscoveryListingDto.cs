namespace IdentityService.Features.Discovery.DTOs;

/// <summary>One diner-facing discovery card. A card is a <em>location</em>, not a restaurant:
/// menus and carts are scoped to restaurant + location, so a chain with two discoverable
/// locations legitimately appears twice, distinguished by <see cref="LocationName"/>.</summary>
public record DiscoveryListingDto(
    string RestaurantId,
    string RestaurantName,
    string? Cuisine,
    string LocationId,
    string LocationName,
    string? Address,
    decimal? DistanceMiles,
    int? EstimatedPickupMinutes
);
