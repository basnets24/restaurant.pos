namespace IdentityService.Features.Tenancy.DTOs;

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
