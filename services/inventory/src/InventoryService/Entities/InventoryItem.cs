using Common.Library;

namespace InventoryService.Entities;

public class InventoryItem : IEntity 
{
    public Guid Id { get; set; }                     // InventoryItem Id
    public Guid MenuItemId { get; set; }             // Link to MenuService.MenuItem
    public string MenuItemName { get; set; } = null!; // for convenience/display
    public int Quantity { get; set; }
    public bool IsAvailable { get; set; } = true;
    public DateTimeOffset AcquiredDate { get; init; } = DateTimeOffset.UtcNow;
    
}