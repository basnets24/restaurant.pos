using Common.Library;
using InventoryService.Entities;
using MassTransit;
using Messaging.Contracts.Events.Inventory;


namespace InventoryService.Consumers;

public class ReleaseInventoryConsumer : IConsumer<ReleaseInventory>
{
    private readonly IRepository<InventoryItem> _inventoryRepo;
    private readonly ILogger<ReleaseInventoryConsumer> _logger;

    public ReleaseInventoryConsumer(IRepository<InventoryItem> inventoryRepo, 
        ILogger<ReleaseInventoryConsumer> logger)
    {
        _inventoryRepo = inventoryRepo;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ReleaseInventory> context)
    {
        foreach (var item in context.Message.Items)
        {
            var inventoryItem = await _inventoryRepo.GetAsync(i => i.MenuItemId == item.MenuItemId);
            if (inventoryItem is null)
            {
                _logger.LogWarning("No inventory found for menu item {MenuItemId} during release", item.MenuItemId);
                continue;
            }

            inventoryItem.Quantity += item.Quantity;
            inventoryItem.IsAvailable = inventoryItem.Quantity > 0;
            await _inventoryRepo.UpdateAsync(inventoryItem);
        }

        _logger.LogInformation("Inventory released for OrderId {OrderId}", context.Message.OrderId);
    }
}