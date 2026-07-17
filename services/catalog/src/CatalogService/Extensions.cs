using CatalogService.Entities;

namespace CatalogService;

public static class Extensions
{
    public static MenuItemDto ToDto(this MenuItem item)
    {
        return new MenuItemDto
        {
            Id = item.Id,
            Name = item.Name,
            Description = item.Description,
            Price = item.Price,
            Category = item.Category,
            IsAvailable = item.IsAvailable,
            CreatedAt = item.CreatedAt
        };
    }

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
