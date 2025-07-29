using Common.Library;

namespace OrderService.Entities;

public class InventoryItem : IEntity
{
    public Guid Id { get; set; }
    public Guid MenuId { get; init; }
    public int Quantity { get; set; }
    public bool IsAvailable { get; set; } 
    
}