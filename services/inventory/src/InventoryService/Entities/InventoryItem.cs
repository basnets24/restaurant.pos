using Common.Library;
using Common.Library.Tenancy;

namespace InventoryService.Entities;

public class InventoryItem : IEntity, ITenantEntity 
{
    public Guid Id { get; set; }                     // InventoryItem Id
    public Guid MenuItemId { get; init; }             // Link to MenuService.MenuItem
    public string MenuItemName { get; set; } = null!; // for convenience/display
    public int Quantity { get; set; }
    public bool IsAvailable { get; set; } = false;
    public DateTimeOffset AcquiredDate { get; init; } = DateTimeOffset.UtcNow;
    
    // tenancy (auto managed by repo)
    public string RestaurantId { get; set; } = default!;
    public string LocationId { get; set; } = default!;
    
}