using MenuService.Entities;

namespace MenuService;

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

}