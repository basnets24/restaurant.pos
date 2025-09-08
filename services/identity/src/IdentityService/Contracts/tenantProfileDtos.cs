namespace IdentityService;

public record TenantMembershipDto(
    string RestaurantId,
    string? DefaultLocationId,
    DateTime CreatedUtc
);

public record TenantRoleDto(
    string RestaurantId,
    string RoleName
);

public record TenantRestaurantDto(
    string Id,
    string Name,
    string? Slug,
    bool IsActive,
    DateTime CreatedUtc
);

public record TenantLocationDto(
    string Id,
    string RestaurantId,
    string Name,
    bool IsActive,
    DateTime CreatedUtc,
    string? TimeZoneId
);

public record TenantUserProfileDto(
    Guid UserId,
    string? Email,
    string? UserName,
    string? DisplayName,
    bool EmailConfirmed,
    bool LockedOut,
    IReadOnlyCollection<string> GlobalRoles,
    IReadOnlyList<TenantMembershipDto> Memberships,
    IReadOnlyList<TenantRoleDto> TenantRoles,
    IReadOnlyList<TenantRestaurantDto> Restaurants,
    IReadOnlyList<TenantLocationDto> Locations
);


