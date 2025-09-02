using Common.Library;
using Common.Library.Tenancy;

namespace OrderService.Entities;

public class DiningTable : IEntity, ITenantEntity
{
    public Guid Id { get; set; }
    public string RestaurantId { get; set; } = default!;
    public string LocationId { get; set; } = default!;
    public int TableNumber { get; set; }
    public string Status { get; set; } = "Available"; // Available | Reserved | Occupied
    public Guid? ActiveCartId { get; set; }

    // NEW: Assign a server to the table
    public Guid? ServerId { get; set; }

    public static readonly string[] AllowedStatuses = { "Available", "Reserved", "Occupied" };
}