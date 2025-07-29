using Common.Library;
using OrderService.Entities;
using MassTransit;
using Messaging.Contracts.Events.Menu;

namespace OrderService.Consumers;

public class MenuItemUpdatedConsumer : IConsumer<MenuItemUpdated>
{
    private readonly IRepository<MenuItem> _menuRepo;
    private readonly ILogger<MenuItemUpdatedConsumer> _logger;

    public MenuItemUpdatedConsumer(
        IRepository<MenuItem> menuRepo, 
        ILogger<MenuItemUpdatedConsumer> logger)
    {
        _menuRepo = menuRepo;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<MenuItemUpdated> context)
    {
        var message = context.Message;
        
        // Update the local menu item projection if it exists
        var localMenuItem = await _menuRepo.GetAsync(message.Id);
        if (localMenuItem is not null)
        {
             localMenuItem.Name = message.Name;
             localMenuItem.Category = message.Category;
             localMenuItem.Price = message.Price;
             await _menuRepo.UpdateAsync(localMenuItem);
             _logger.LogInformation("Updated local MenuItem cache: {MenuItemId} - {MenuItemName}", message.Id, message.Name);
        }else
        {
            _logger.LogWarning("Local MenuItem not found for update: {MenuItemId} - {MenuItemName}", message.Id, message.Name);
        }
        
    }
}