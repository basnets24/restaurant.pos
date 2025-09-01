using Common.Library;
using Common.Library.Tenancy;

namespace OrderService.Entities;

public class InventoryItem : IEntity, ITenantEntity
{
    public Guid Id { get; set; }
    public string RestaurantId { get; set; } = default!;
    public string LocationId { get; set; } = default!;
    public Guid MenuId { get; init; }
    public int Quantity { get; set; }
    public bool IsAvailable { get; set; } 
    
}