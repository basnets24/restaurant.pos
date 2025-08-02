using Common.Library;
using MassTransit;
using Messaging.Contracts.Events.Inventory;
using OrderService.Entities;

namespace OrderService.Consumers;

public class InventoryItemUpdatedConsumer : IConsumer<InventoryItemUpdated>
{
    private readonly IRepository<InventoryItem> _inventoryRepo;
    private readonly ILogger<InventoryItemUpdatedConsumer> _logger;

    public InventoryItemUpdatedConsumer(
        IRepository<InventoryItem> inventoryRepo,
        ILogger<InventoryItemUpdatedConsumer> logger)
    {
        _inventoryRepo = inventoryRepo;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<InventoryItemUpdated> context)
    {
        var msg = context.Message;
        var inventoryItem = await _inventoryRepo.GetAsync(item => item.MenuId == msg.MenuItemId);

        if (inventoryItem is null)
        {
            var newItem = new InventoryItem
            {
                MenuId = msg.MenuItemId,
                Quantity = msg.Quantity,
                IsAvailable = msg.IsAvailable
            };

            await _inventoryRepo.CreateAsync(newItem);
            _logger.LogInformation("Created inventory item cache in OrderService from InventoryItemUpdated event for MenuItemId {MenuItemId} with quantity {Quantity}",
                msg.MenuItemId, msg.Quantity);
        }
        else
        {
            inventoryItem.Quantity = msg.Quantity;
            inventoryItem.IsAvailable = msg.IsAvailable;

            await _inventoryRepo.UpdateAsync(inventoryItem);
            _logger.LogInformation("Updated inventory item cache in OrderService from InventoryItemUpdated event for MenuItemId {MenuItemId} with quantity {Quantity}",
                msg.MenuItemId, msg.Quantity);
        }
    }
}