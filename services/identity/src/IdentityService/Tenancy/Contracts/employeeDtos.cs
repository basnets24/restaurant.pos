namespace IdentityService;

public record EmployeeListItemDto(
    Guid UserId,
    string? Email,
    string? UserName,
    string? DisplayName,
    string? DefaultLocationId,
    IReadOnlyCollection<string> TenantRoles
);

public record EmployeeRoleUpdateDto(
    IReadOnlyCollection<string> Roles
);

public record AddEmployeeDto(
    Guid UserId,
    string? DefaultLocationId,
    IReadOnlyCollection<string>? Roles
);

public record DefaultLocationUpdateDto(
    string DefaultLocationId
);

public record EmployeeDetailDto(
    Guid UserId,
    string? Email,
    string? UserName,
    string? DisplayName,
    bool EmailConfirmed,
    bool LockedOut,
    string? DefaultLocationId,
    IReadOnlyCollection<string> TenantRoles
);
