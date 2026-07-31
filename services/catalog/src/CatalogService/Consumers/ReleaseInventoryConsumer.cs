using Common.Library;
using CatalogService.Entities;
using CatalogService.Services;
using MassTransit;
using Messaging.Contracts.Events.Inventory;


namespace CatalogService.Consumers;

public class ReleaseInventoryConsumer : IConsumer<ReleaseInventory>
{
    private readonly IRepository<MenuItem> _menuRepository;
    private readonly MenuStockService _stock;
    private readonly ILogger<ReleaseInventoryConsumer> _logger;

    public ReleaseInventoryConsumer(IRepository<MenuItem> menuRepository,
        MenuStockService stock,
        ILogger<ReleaseInventoryConsumer> logger)
    {
        _menuRepository = menuRepository;
        _stock = stock;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ReleaseInventory> context)
    {
        foreach (var item in context.Message.Items)
        {
            var menuItem = await _menuRepository.GetAsync(m => m.Id == item.MenuItemId);
            if (menuItem is null)
            {
                _logger.LogWarning("No menu item found for {MenuItemId} during inventory release", item.MenuItemId);
                continue;
            }

            // Routed through MenuStockService so IsAvailable auto-derives correctly
            // when a release restocks a depleted item. Quantity is an absolute
            // value, not a delta.
            await _stock.ApplyStockChangeAsync(menuItem, menuItem.Quantity + item.Quantity, isAvailableOverride: null);
        }

        _logger.LogInformation("Inventory released for OrderId {OrderId}", context.Message.OrderId);
    }
}
