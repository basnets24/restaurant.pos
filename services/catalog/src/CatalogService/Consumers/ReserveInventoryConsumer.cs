using Common.Library;
using Common.Library.Tenancy;
using MassTransit;
using CatalogService.Entities;
using CatalogService.Exceptions;
using CatalogService.Services;
using Messaging.Contracts.Events.Inventory;


namespace CatalogService.Consumers;

public class ReserveInventoryConsumer : IConsumer<ReserveInventory>
{
    private readonly IRepository<MenuItem> _menuRepository;
    private readonly MenuStockService _stock;
    private readonly ILogger<ReserveInventoryConsumer> _logger;
    private readonly ITenantContext _tenant;

    public ReserveInventoryConsumer(
        IRepository<MenuItem> menuRepository,
        MenuStockService stock,
        ILogger<ReserveInventoryConsumer> logger,
        ITenantContext tenant)
    {
        _menuRepository = menuRepository;
        _stock = stock;
        _logger = logger;
        _tenant = tenant;
    }

    public async Task Consume(ConsumeContext<ReserveInventory> context)
    {
        var correlationId = context.Message.CorrelationId;
        var orderId = context.Message.OrderId;
        var items = context.Message.Items;

        // Tracks each item's pre-reservation quantity, so a later item's failure
        // can restore the exact original value rather than leaving a partial
        // reservation in place.
        var decremented = new List<(Guid MenuItemId, int OriginalQuantity)>();

        try
        {
            foreach (var item in items)
            {
                var menuItem = await _menuRepository.GetAsync(m => m.Id == item.MenuItemId);
                if (menuItem is null)
                {
                    throw new UnknownItemException(item.MenuItemId);
                }

                if (menuItem.Quantity < item.Quantity)
                {
                    throw new InsufficientInventoryException(item.MenuItemId, item.Quantity, menuItem.Quantity);
                }

                // Routed through MenuStockService (not a raw repository write) so
                // IsAvailable auto-derives correctly when quantity hits zero.
                // Quantity is an absolute value, not a delta.
                var originalQuantity = menuItem.Quantity;
                await _stock.ApplyStockChangeAsync(menuItem, originalQuantity - item.Quantity, isAvailableOverride: null);
                decremented.Add((menuItem.Id, originalQuantity));
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

            foreach (var (menuItemId, originalQuantity) in decremented)
            {
                var menuItem = await _menuRepository.GetAsync(menuItemId);
                if (menuItem is null) continue;
                await _stock.ApplyStockChangeAsync(menuItem, originalQuantity, isAvailableOverride: null);
            }

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
