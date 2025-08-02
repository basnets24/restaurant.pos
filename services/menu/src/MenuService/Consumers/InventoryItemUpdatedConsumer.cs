using Common.Library;
using MassTransit;
using MenuService.Entities;
using Messaging.Contracts.Events.Inventory;

namespace MenuService.Consumers;
public class InventoryItemUpdatedConsumer : IConsumer<InventoryItemUpdated>
{
    private readonly IRepository<MenuItem> _menuRepo;
    private readonly ILogger<InventoryItemUpdatedConsumer> _logger;

    public InventoryItemUpdatedConsumer(
        IRepository<MenuItem> menuRepo,
        ILogger<InventoryItemUpdatedConsumer> logger)
    {
        _menuRepo = menuRepo;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<InventoryItemUpdated> context)
    {
        var msg = context.Message;

        var menuItem = await _menuRepo.GetAsync(m => m.Id == msg.MenuItemId);
        if (menuItem is null)
        {
            _logger.LogWarning("MenuItem with ID {MenuItemId} not found", msg.MenuItemId);
            return;
        }

        menuItem.IsAvailable = msg.IsAvailable;
        await _menuRepo.UpdateAsync(menuItem);

        _logger.LogInformation("Updated IsAvailable for MenuItem {MenuItemId} to {IsAvailable}", 
            msg.MenuItemId, msg.IsAvailable);
    }
}