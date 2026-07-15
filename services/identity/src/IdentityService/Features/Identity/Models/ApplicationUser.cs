using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;

namespace IdentityService.Features.Identity.Models;

public class ApplicationUser : IdentityUser<Guid>
{
    public string? AccessCode { get; set; }

    [StringLength(64)]
    public string? DisplayName { get; set; }

    public string? CurrentRestaurantId { get; set; }
    public string? CurrentLocationId { get; set; }
}
