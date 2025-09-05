using System.ComponentModel.DataAnnotations;

namespace IdentityService;

public record UserDto(
    Guid Id,
    string? Email,
    string? UserName,
    string? DisplayName,
    IReadOnlyCollection<string> Roles
);

public record UserListItemDto(
    Guid Id,
    string? Email,
    string? UserName,
    string? DisplayName,
    bool EmailConfirmed,
    bool LockedOut,
    IEnumerable<string> Roles
);

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
    string RestaurantId,
    string LocationId,
    IEnumerable<string> Roles
);

public class UserUpdateDto
{
    [StringLength(64)]
    public string? UserName { get; set; }

    [EmailAddress]
    public string? Email { get; set; }

    // Use string to keep leading zeros; enforce 4–6 digits
    [RegularExpression(@"^\d{4,6}$")]
    public string? AccessCode { get; set; }

    [StringLength(64)]
    public string? DisplayName { get; set; }

    public bool? LockoutEnabled { get; set; }
    public DateTimeOffset? LockoutEnd { get; set; }

    public bool? TwoFactorEnabled { get; set; }

    public required string RestaurantId { get; set; }
    public  required string LocationId { get; set; }
    
}

public class AddRolesDto
{
    [Required]
    [MinLength(1)]
    public List<string> Roles { get; set; } = new();
}

public record UsersQuery(
    string? Username,
    string? Role,
    int Page = 1,
    int PageSize = 25
);

public record Paged<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    long Total
);