using System.ComponentModel.DataAnnotations;

namespace IdentityService.Features.Identity.DTOs;

public class AddRolesDto
{
    [Required]
    [MinLength(1)]
    public List<string> Roles { get; set; } = new();
}
