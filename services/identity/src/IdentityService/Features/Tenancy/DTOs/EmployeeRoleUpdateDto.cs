namespace IdentityService.Features.Tenancy.DTOs;

public record EmployeeRoleUpdateDto(
    IReadOnlyCollection<string> Roles
);
