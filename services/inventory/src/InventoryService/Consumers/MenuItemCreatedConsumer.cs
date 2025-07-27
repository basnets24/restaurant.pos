using Common.Library;
using InventoryService.Entities;
using MassTransit;
using Messaging.Contracts.Events.Menu;

namespace InventoryService.Consumers;

public class MenuItemCreatedConsumer : IConsumer<MenuItemCreated>
{
    private readonly IRepository<MenuItem> _menuRepo;
    private readonly IRepository<InventoryItem> _inventoryRepo;
    
    public MenuItemCreatedConsumer(
        IRepository<MenuItem> menuRepo, IRepository<InventoryItem> inventoryRepo)
    {
        _menuRepo = menuRepo;
        _inventoryRepo = inventoryRepo;
    }
    
    public async Task Consume(ConsumeContext<MenuItemCreated> context)
    {
        var message = context.Message;
        
        var existing = await _inventoryRepo.GetAsync(i => i.MenuItemId == message.Id);
        if (existing is not null)
        {
            // Item already processed — exit gracefully
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
    }
}