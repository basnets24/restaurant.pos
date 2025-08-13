using Microsoft.AspNetCore.Identity;

namespace IdentityService.Entities;

public class ApplicationUser : IdentityUser
{
    public int? AccessCode { get; set; }
}