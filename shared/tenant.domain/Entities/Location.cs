using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenant.Domain.Entities;

[Table("TenantLocations")]
public class Location
{
    [Key, MaxLength(32)]
    public string Id { get; set; } = Guid.NewGuid().ToString("n");

    [Required, MaxLength(32)]
    public string RestaurantId { get; set; } = default!;

    [Required, MaxLength(150)]
    public string Name { get; set; } = default!;

    public string? TimeZoneId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    // Diner-facing discovery. Defaults keep every existing location unlisted until
    // someone opts it in explicitly - adding these fields must not publish anyone.
    [MaxLength(250)]
    public string? Address { get; set; }

    /// <summary>Static seeded distance shown on discovery cards. Not derived from the
    /// diner's position - there is no geolocation anywhere in the platform.</summary>
    public decimal? DisplayDistanceMiles { get; set; }

    public int? EstimatedPickupMinutes { get; set; }

    public bool IsDiscoverable { get; set; } = false;
}

