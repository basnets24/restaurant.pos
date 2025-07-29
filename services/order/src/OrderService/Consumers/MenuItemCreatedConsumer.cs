using Common.Library;
using OrderService.Entities;
using MassTransit;
using Messaging.Contracts.Events.Menu;

namespace OrderService.Consumers;

public class MenuItemCreatedConsumer : IConsumer<MenuItemCreated>
{
    private readonly IRepository<MenuItem> _menuRepo;
    private readonly ILogger<MenuItemCreatedConsumer> _logger;
    
    public MenuItemCreatedConsumer(
        IRepository<MenuItem> menuRepo, 
        ILogger<MenuItemCreatedConsumer> logger)
    {
        _menuRepo = menuRepo;
        _logger = logger;
    }
    
    public async Task Consume(ConsumeContext<MenuItemCreated> context)
    {
        var message = context.Message;
        
        var existing = await _menuRepo.GetAsync(i => i.Id == message.Id);
        if (existing is not null)
        {
            // Item already processed — exit gracefully
            _logger.LogWarning("MenuItem {MenuItemName} with ID {MenuItemId} already cached. Skipping creation."
                ,message.Name, message.Id);
            return;
        }
        
        // Save menu item snapshot
        var menuItem = new MenuItem
        {
            Id = message.Id,
            Name = message.Name,
            Category = message.Category, 
            Price = message.Price
        }; 
       await  _menuRepo.CreateAsync(menuItem);
       _logger.LogInformation("Cached MenuItem {Name} with {MenuItemId}", message.Name, message.Id);
       
    }
}