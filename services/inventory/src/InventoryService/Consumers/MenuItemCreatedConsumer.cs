using Common.Library;
using InventoryService.Entities;
using MassTransit;
using Messaging.Contracts.Events.Menu;

namespace InventoryService.Consumers;

public class MenuItemCreatedConsumer : IConsumer<MenuItemCreated>
{
    private readonly IRepository<MenuItem> _menuRepo;
    private readonly IRepository<InventoryItem> _inventoryRepo;
    private readonly ILogger<MenuItemCreatedConsumer> _logger;
    
    public MenuItemCreatedConsumer(
        IRepository<MenuItem> menuRepo, 
        IRepository<InventoryItem> inventoryRepo,
        ILogger<MenuItemCreatedConsumer> logger)
    {
        _menuRepo = menuRepo;
        _inventoryRepo = inventoryRepo;
        _logger = logger;
    }
    
    public async Task Consume(ConsumeContext<MenuItemCreated> context)
    {
        var message = context.Message;
        
        var existing = await _inventoryRepo.GetAsync(i => i.MenuItemId == message.Id);
        if (existing is not null)
        {
            // Item already processed — exit gracefully
            _logger.LogWarning("MenuItem with ID {MenuItemId} already exists. Skipping creation."
                , message.Id);
            return;
        }
        
        // Save menu item snapshot
        var menuItem = new MenuItem
        {
            Id = message.Id,
            Name = message.Name,
            Category = message.Category
        }; 
       await  _menuRepo.CreateAsync(menuItem);
       _logger.LogInformation("Created local MenuItem {MenuItemId} - {Name}",
           message.Id, message.Name);
       
       // Create an initial inventory item
        var inventoryItem = new InventoryItem
        {
            Id = Guid.NewGuid(),
            MenuItemId = message.Id,
            MenuItemName = message.Name,
            Quantity = 0,
            IsAvailable = message.IsAvailable,
            AcquiredDate = DateTimeOffset.UtcNow
        };
        await _inventoryRepo.CreateAsync(inventoryItem);
        _logger.LogInformation("Created InventoryItem for MenuItem {MenuItemId}", message.Id);
    }
}