using Common.Library;
using MassTransit;
using Messaging.Contracts.Events.Inventory;
using OrderService.Entities;

namespace OrderService.Consumers;

public class InventoryItemDepletedConsumer : IConsumer<InventoryItemDepleted>
{
    private readonly IRepository<InventoryItem> _inventoryRepo;
    private readonly ILogger<InventoryItemDepletedConsumer> _logger;

    public InventoryItemDepletedConsumer(
        IRepository<InventoryItem> inventoryRepo,
        ILogger<InventoryItemDepletedConsumer> logger)
    {
        _inventoryRepo = inventoryRepo;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<InventoryItemDepleted> context)
    {
        var msg = context.Message;

        var inventoryItem = await _inventoryRepo.GetAsync(item => item.MenuId == msg.MenuItemId);
        if (inventoryItem is null)
        {
            _logger.LogWarning("Depletion event received for unknown MenuItemId {MenuItemId}", msg.MenuItemId);
            return;
        }
        inventoryItem.Quantity = 0;
        inventoryItem.IsAvailable = false;
        await _inventoryRepo.UpdateAsync(inventoryItem);

        _logger.LogInformation(
            "Inventory item cache in OrderService marked as depleted for MenuItemId {MenuItemId}",
            msg.MenuItemId);
    }
}