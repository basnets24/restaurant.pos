namespace IdentityService.Features.Tenancy.DTOs;

public record TenantWithLocationsDto(
    TenantRestaurantDto Restaurant,
    IReadOnlyList<TenantLocationDto> Locations
);
