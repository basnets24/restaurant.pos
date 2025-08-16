using System.ComponentModel.DataAnnotations;

namespace IdentityService;

public record UserDto(
    Guid Id,
    string? Email,
    string? UserName,
    IReadOnlyCollection<string> Roles
);

public record UserListItemDto(
    Guid Id,
    string? Email,
    string? UserName,
    bool EmailConfirmed,
    bool LockedOut,
    IEnumerable<string> Roles
);

public record UserDetailDto(
    Guid Id,
    string? Email,
    string? UserName,
    bool EmailConfirmed,
    bool LockedOut,
    DateTimeOffset? LockoutEnd,
    IEnumerable<string> Roles
);

public class UserUpdateDto
{
    public string? Email { get; set; }
    public int? AccessCode { get; set; }
    public bool? LockoutEnabled { get; set; }
    public DateTimeOffset? LockoutEnd { get; set; }
    
}

public class AddRolesDto
{
    [Required]
    [MinLength(1)]
    public List<string> Roles { get; set; } = new();
}