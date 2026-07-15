namespace IdentityService.Features.Tenancy.DTOs;

public record TenantRestaurantDto(
    string Id,
    string Name,
    string? Slug,
    bool IsActive,
    DateTime CreatedUtc
);
