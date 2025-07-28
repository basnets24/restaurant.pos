using Common.Library;
using MassTransit;
using MenuService.Entities;
using Messaging.Contracts.Events.Inventory;

namespace MenuService.Consumers;

public class InventoryItemRestockedConsumer : IConsumer<InventoryItemRestocked>
{
    private readonly IRepository<MenuItem> _repository;
    private readonly ILogger<InventoryItemRestockedConsumer> _logger;

    public InventoryItemRestockedConsumer(
        IRepository<MenuItem> repository,
        ILogger<InventoryItemRestockedConsumer> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<InventoryItemRestocked> context)
    {
        var msg = context.Message; 
        
        var menuItem = await _repository.GetAsync(msg.MenuItemId);
        if ( menuItem is null )
        {
            _logger.LogWarning("Menu item {Id} not found when trying to mark as available", msg.MenuItemId);
            return;
        }
        
        if ( menuItem.IsAvailable )
        {
            _logger.LogInformation("Menu item {Id} is already available", menuItem.Id);
            return;
        }
        
        menuItem.IsAvailable = true;
        await _repository.UpdateAsync(menuItem);
        _logger.LogInformation("Menu item {Id} - {Name} marked as available", menuItem.Id, menuItem.Name);
    }
}