using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Tenant.Domain.Entities;

[Table("RestaurantUserRoles")]
public class RestaurantUserRole
{
    [Key, MaxLength(32)]
    public string Id { get; set; } = Guid.NewGuid().ToString("n");

    [Required] public Guid UserId { get; set; } = default!;
    [Required, MaxLength(32)] public string RestaurantId { get; set; } = default!;
    [Required, MaxLength(64)] public string RoleName { get; set; } = default!; // "Admin"|"Manager"|"Server"
}

