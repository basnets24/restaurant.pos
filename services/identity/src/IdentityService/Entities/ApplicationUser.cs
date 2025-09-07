using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace IdentityService.Entities;

public class ApplicationUser : IdentityUser<Guid>
{
    public string? AccessCode { get; set; }
    
    [StringLength(64)]
    public string? DisplayName { get; set; }
    
    
}