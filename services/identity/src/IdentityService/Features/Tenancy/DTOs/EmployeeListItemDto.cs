namespace IdentityService.Features.Tenancy.DTOs;

public record EmployeeListItemDto(
    Guid UserId,
    string? Email,
    string? UserName,
    string? DisplayName,
    string? DefaultLocationId,
    IReadOnlyCollection<string> TenantRoles
);
