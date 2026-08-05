using System.ComponentModel.DataAnnotations;

namespace IdentityService.Features.Discovery.DTOs;

/// <summary>
/// Self-service signup for a diner. Deliberately minimal: no restaurant, no location, no role.
/// A diner belongs to no tenant - that is what distinguishes them from every other account in
/// the system, and nothing here should ever grow a field that implies otherwise.
/// </summary>
public record DinerRegistrationDto
{
    [Required, EmailAddress, MaxLength(256)]
    public string Email { get; init; } = null!;

    [Required, MaxLength(128)]
    public string Password { get; init; } = null!;

    [MaxLength(64)]
    public string? DisplayName { get; init; }
}
