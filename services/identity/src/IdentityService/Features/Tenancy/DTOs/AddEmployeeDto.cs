namespace IdentityService.Features.Tenancy.DTOs;

public record AddEmployeeDto(
    Guid UserId,
    string? DefaultLocationId,
    IReadOnlyCollection<string>? Roles
);
