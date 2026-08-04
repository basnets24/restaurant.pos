using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenant.Domain.Entities;

[Table("Tenants")] // stored as tenant.Tenants via DbContext default schema
public class Restaurant
{
    [Key, MaxLength(32)]
    public string Id { get; set; } = Guid.NewGuid().ToString("n");

    [Required, MaxLength(200)]
    public string Name { get; set; } = default!;

    [MaxLength(128)]
    public string? Slug { get; set; } // optional

    // Nullable: existing tenants have no sensible value, and discovery treats a null
    // cuisine as matching every filter rather than delisting the restaurant.
    [MaxLength(64)]
    public string? Cuisine { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}

