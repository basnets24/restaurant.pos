using Microsoft.AspNetCore.Identity;

namespace IdentityService.Entities;

public class ApplicationUser : IdentityUser<Guid>
{
    public int? AccessCode { get; set; }
}