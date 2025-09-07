using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IdentityService.Entities;

[Table("RestaurantMemberships")]
public class RestaurantMembership
{
    [Key, MaxLength(32)]
    public string Id { get; set; } = Guid.NewGuid().ToString("n");

    [Required] public Guid UserId { get; set; } = default!;
    [Required, MaxLength(32)] public string RestaurantId { get; set; } = default!;
    [MaxLength(32)] public string? DefaultLocationId { get; set; }
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}