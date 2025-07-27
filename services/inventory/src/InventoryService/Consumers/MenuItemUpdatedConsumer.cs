using Common.Library;
using InventoryService.Entities;
using MassTransit;
using Messaging.Contracts.Events.Menu;

namespace InventoryService.Consumers;

public class MenuItemUpdatedConsumer : IConsumer<MenuItemUpdated>
{
    private readonly IRepository<MenuItem> _menuRepo;
    private readonly IRepository<InventoryItem> _inventoryRepo;
    private readonly ILogger<MenuItemUpdatedConsumer> _logger;

    public MenuItemUpdatedConsumer(
        IRepository<MenuItem> menuRepo, 
        IRepository<InventoryItem> inventoryRepo, ILogger<MenuItemUpdatedConsumer> logger)
    {
        _menuRepo = menuRepo;
        _inventoryRepo = inventoryRepo;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<MenuItemUpdated> context)
    {
        var message = context.Message;
        // Check if the inventory item exists
        var inventoryItem = await _inventoryRepo.GetAsync(i => i.MenuItemId == message.Id);
        if (inventoryItem is not null)
        {
            // Check if update is actually needed
            if (inventoryItem.MenuItemName != message.Name 
                || inventoryItem.IsAvailable != message.IsAvailable)
            {
                inventoryItem.MenuItemName = message.Name;
                inventoryItem.IsAvailable = message.IsAvailable;
                await _inventoryRepo.UpdateAsync(inventoryItem);
                _logger.LogInformation("Updated InventoryItem for MenuItem {MenuItemId}", message.Id);
            }
            else
            {
                _logger.LogInformation("No changes detected in InventoryItem for MenuItem {MenuItemId}", 
                    message.Id);
            }
        }else
        {
            _logger.LogWarning("InventoryItem not found for MenuItem {MenuItemId}", message.Id);
        }
        
        // Update the local menu item projection if it exists
        var localMenuItem = await _menuRepo.GetAsync(message.Id);
        if (localMenuItem is not null)
        {
            if (localMenuItem.Name != message.Name || 
                localMenuItem.Category != message.Category)
            {
                localMenuItem.Name = message.Name;
                localMenuItem.Category = message.Category;
                await _menuRepo.UpdateAsync(localMenuItem);
                
            }
        }else
        {
            _logger.LogWarning("Local MenuItem not found for update: {MenuItemId}", message.Id);
        }
        
    }
}