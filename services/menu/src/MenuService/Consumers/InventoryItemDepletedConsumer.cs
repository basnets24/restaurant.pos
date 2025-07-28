using Common.Library;
using MassTransit;
using MenuService.Entities;
using Messaging.Contracts.Events.Inventory;

namespace MenuService.Consumers;

public class InventoryItemDepletedConsumer : IConsumer<InventoryItemDepleted>
{
    private readonly ILogger<InventoryItemDepletedConsumer> _logger;
    private readonly IRepository<MenuItem> _repository;

    public InventoryItemDepletedConsumer(ILogger<InventoryItemDepletedConsumer> logger, 
        IRepository<MenuItem> repository)
    {
        _logger = logger;
        _repository = repository;
    }

    public async Task Consume(ConsumeContext<InventoryItemDepleted> context)
    {
        var msg = context.Message;
        var menuItem = await _repository.GetAsync(msg.MenuItemId);
        
        if (menuItem is null)
        {
            _logger.LogWarning("Menu item {Id} not found when trying to mark as available", msg.MenuItemId);
            return;
        }
        
        if (!menuItem.IsAvailable)
        {
            _logger.LogInformation("Menu item {Id} is already unavailable", menuItem.Id);
            return;
        }
        
        menuItem.IsAvailable = false;
        await _repository.UpdateAsync(menuItem);
        _logger.LogInformation("Menu item {Id} - {Name} marked as unavailable", menuItem.Id, menuItem.Name);
    }
}