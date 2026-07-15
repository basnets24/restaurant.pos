using System.ComponentModel.DataAnnotations;
using IdentityService.Features.Tenancy.Validation;

namespace IdentityService.Features.Tenancy.DTOs;

public record CreateLocationDto(
    [Required(ErrorMessage = "Location name is required")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Location name must be between 1 and 100 characters")]
    [RegularExpression(@"^[a-zA-Z0-9\s\-_.()]+$", ErrorMessage = "Location name contains invalid characters")]
    [SafeName]
    string Name,

    [StringLength(100, ErrorMessage = "Time zone ID cannot exceed 100 characters")]
    [ValidTimeZone]
    string? TimeZoneId
);
