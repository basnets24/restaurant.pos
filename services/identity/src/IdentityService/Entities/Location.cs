using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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
}