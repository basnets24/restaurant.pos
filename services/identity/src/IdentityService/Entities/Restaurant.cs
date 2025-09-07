namespace IdentityService.Entities;

using System.ComponentModel.DataAnnotations;


using System.ComponentModel.DataAnnotations.Schema;

[Table("Tenants")] // stored as tenant.Tenants via DbContext default schema
public class Restaurant
{
    [Key, MaxLength(32)]
    public string Id { get; set; } = Guid.NewGuid().ToString("n");

    [Required, MaxLength(200)]
    public string Name { get; set; } = default!;

    [MaxLength(128)]
    public string? Slug { get; set; } // optional

    public bool IsActive { get; set; } = true;
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}