namespace IdentityService.Features.Identity.DTOs;

public record UserListItemDto(
    Guid Id,
    string? Email,
    string? UserName,
    string? DisplayName,
    bool EmailConfirmed,
    bool LockedOut,
    IEnumerable<string> Roles
);
