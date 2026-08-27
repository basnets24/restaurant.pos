using System.ComponentModel.DataAnnotations;

namespace IdentityService.Features.Tenancy.DTOs;

/// <summary>Restaurant-level discovery settings.</summary>
public record UpdateRestaurantDiscoveryDto(
    [StringLength(64, ErrorMessage = "Cuisine cannot exceed 64 characters")]
    string? Cuisine
);

/// <summary>
/// Per-location diner-facing listing settings. Deliberately a separate endpoint from
/// <see cref="UpdateLocationDto"/> rather than extra fields on it: that one is a PUT with
/// full-replace semantics, so folding <c>IsDiscoverable</c> into it would mean any existing
/// caller that omits the field silently unpublishes the restaurant. Opting into a public
/// listing is also a consequential act worth keeping as its own explicit request.
/// </summary>
public record UpdateLocationDiscoveryDto(
    bool IsDiscoverable,

    [StringLength(250, ErrorMessage = "Address cannot exceed 250 characters")]
    string? Address,

    [Range(0, 999.99, ErrorMessage = "Distance must be between 0 and 999.99 miles")]
    decimal? DisplayDistanceMiles,

    [Range(1, 600, ErrorMessage = "Estimated pickup time must be between 1 and 600 minutes")]
    int? EstimatedPickupMinutes
);
