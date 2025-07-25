using InventoryService.Entities;

namespace InventoryService;

public static class Extensions
{
    public static InventoryItemDto ToDto(this InventoryItem item)
    {
        return new InventoryItemDto
        {
            Id = item.Id,
            MenuItemId = item.MenuItemId,
            MenuItemName = item.MenuItemName,
            Quantity = item.Quantity,
            IsAvailable = item.IsAvailable,
            AcquiredDate = item.AcquiredDate
        };

    }
    
}