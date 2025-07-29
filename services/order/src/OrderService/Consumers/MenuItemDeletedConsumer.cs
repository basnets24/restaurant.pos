using Common.Library;
using OrderService.Entities;
using MassTransit;
using Messaging.Contracts.Events.Menu;

namespace OrderService.Consumers;

public class MenuItemDeletedConsumer : IConsumer<MenuItemDeleted>
{
    private readonly IRepository<MenuItem> _menuItems;
    private readonly ILogger<MenuItemDeletedConsumer> _logger;

    public MenuItemDeletedConsumer(
        IRepository<MenuItem> menuItems,
        ILogger<MenuItemDeletedConsumer> logger)
    {
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
        
    }
}