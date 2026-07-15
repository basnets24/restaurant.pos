namespace IdentityService.Features.Identity.DTOs;

public record UserDetailDto(
    Guid Id,
    string? Email,
    string? UserName,
    string? DisplayName,
    bool EmailConfirmed,
    bool LockoutEnabled,
    bool LockedOut,
    int AccessFailedCount,
    bool TwoFactorEnabled,
    DateTimeOffset? LockoutEnd,
    IEnumerable<string> Roles
);
