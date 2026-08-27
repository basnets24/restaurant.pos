using System.ComponentModel.DataAnnotations;

namespace IdentityService.Features.Identity.DTOs;

public class UserUpdateDto
{
    [StringLength(64)]
    public string? UserName { get; set; }

    [EmailAddress]
    public string? Email { get; set; }

    [RegularExpression(@"^\d{4,6}$")]
    public string? AccessCode { get; set; }

    [StringLength(64)]
    public string? DisplayName { get; set; }

    public bool? LockoutEnabled { get; set; }
    public DateTimeOffset? LockoutEnd { get; set; }
    public bool? TwoFactorEnabled { get; set; }
}
