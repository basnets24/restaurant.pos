using Common.Library;
using Common.Library.Tenancy;
using MassTransit;
using InventoryService.Entities;
using InventoryService.Exceptions;
using Messaging.Contracts.Events.Inventory;


namespace InventoryService.Consumers;

public class ReserveInventoryConsumer : IConsumer<ReserveInventory>
{
    private readonly IRepository<InventoryItem> _inventoryRepository;
    private readonly ILogger<ReserveInventoryConsumer> _logger;
    private readonly ITenantContext _tenant;

    public ReserveInventoryConsumer(
        IRepository<InventoryItem> inventoryRepository,
        ILogger<ReserveInventoryConsumer> logger,
        ITenantContext tenant)
    {
        _inventoryRepository = inventoryRepository;
        _logger = logger;
        _tenant = tenant;
    }

    public async Task Consume(ConsumeContext<ReserveInventory> context)
    {
        var correlationId = context.Message.CorrelationId;
        var orderId = context.Message.OrderId;
        var items = context.Message.Items;

        try
        {
            foreach (var item in items)
            {
                var inventoryItem = await _inventoryRepository.GetAsync(i=> i.MenuItemId == item.MenuItemId);
                if (inventoryItem is null)
                {
                    throw new UnknownItemException(item.MenuItemId);
                }

                if (inventoryItem.Quantity < item.Quantity)
                {
                    throw new InsufficientInventoryException(item.MenuItemId, item.Quantity, inventoryItem.Quantity);
                }

                inventoryItem.Quantity -= item.Quantity;
                inventoryItem.IsAvailable = inventoryItem.Quantity > 0;
                await _inventoryRepository.UpdateAsync(inventoryItem);
            }

            await context.Publish(new InventoryReserved(
                correlationId,
                orderId,
                _tenant.RestaurantId,
                _tenant.LocationId
            ));

            _logger.LogInformation("Inventory reserved for order {OrderId}", orderId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Failed to reserve inventory for order {OrderId}: {Message}", orderId, ex.Message);

            await context.Publish(new InventoryReserveFaulted(
                correlationId,
                orderId,
                ex.Message,
                _tenant.RestaurantId,
                _tenant.LocationId
            ));
        }
    }
}
