namespace IdentityService.Features.Identity.DTOs;

public record UserDto(
    Guid Id,
    string? Email,
    string? UserName,
    string? DisplayName,
    IReadOnlyCollection<string> Roles
);
