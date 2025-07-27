using Common.Library;
using InventoryService.Entities;
using MassTransit;
using Messaging.Contracts.Events.Menu;

namespace InventoryService.Consumers;

public class MenuItemDeletedConsumer : IConsumer<MenuItemDeleted>
{
    private readonly IRepository<InventoryItem> _inventoryItems;
    private readonly IRepository<MenuItem> _menuItems;
    private readonly ILogger<MenuItemDeletedConsumer> _logger;

    public MenuItemDeletedConsumer(
        IRepository<InventoryItem> inventoryItems,
        IRepository<MenuItem> menuItems,
        ILogger<MenuItemDeletedConsumer> logger)
    {
        _inventoryItems = inventoryItems;
        _menuItems = menuItems;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<MenuItemDeleted> context)
    {
        var id = context.Message.Id;

        // Try to delete local MenuItem 
        var menuItem = await _menuItems.GetAsync(id);
        if (menuItem is not null)
        {
            await _menuItems.DeleteAsync(id);
            _logger.LogInformation("Deleted local MenuItem: {MenuItemId}", id);
        }
        else
        {
            _logger.LogWarning("MenuItem not found in local projection for deletion: {MenuItemId}", id);
        }

        // Try to delete InventoryItem by MenuItemId
        var inventoryItem = await _inventoryItems.GetAsync(i => i.MenuItemId == id);
        if (inventoryItem is not null)
        {
            await _inventoryItems.DeleteAsync(inventoryItem.Id);
            _logger.LogInformation("Deleted InventoryItem linked to MenuItem: {MenuItemId}", id);
        }
        else
        {
            _logger.LogWarning("No InventoryItem linked to MenuItem: {MenuItemId} — nothing to delete", id);
        }
    }
}