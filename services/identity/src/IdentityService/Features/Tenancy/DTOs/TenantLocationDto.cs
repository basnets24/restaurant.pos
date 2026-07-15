namespace IdentityService.Features.Tenancy.DTOs;

public record TenantLocationDto(
    string Id,
    string RestaurantId,
    string Name,
    bool IsActive,
    DateTime CreatedUtc,
    string? TimeZoneId
);
