using Common.Library;
using Common.Library.Tenancy;
using CatalogService.Entities;
using MassTransit;
using Messaging.Contracts.Events.Inventory;


namespace CatalogService.Services;

public class MenuStockService
{
    private readonly IRepository<MenuItem> _repository;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ILogger<MenuStockService> _logger;
    private readonly ITenantContext _tenant;

    public MenuStockService(
        IRepository<MenuItem> repository,
        IPublishEndpoint publishEndpoint,
        ILogger<MenuStockService> logger,
        ITenantContext tenant)
    {
        _repository = repository;
        _publishEndpoint = publishEndpoint;
        _logger = logger;
        _tenant = tenant;
    }

    // Caller has already fetched `item` and may have mutated Name/Description/Price/Category
    // separately; this only handles Quantity/IsAvailable + event publishing + persistence.
    // If isAvailableOverride is provided it always wins; otherwise IsAvailable is derived
    // from the new Quantity whenever Quantity changes.
    public async Task ApplyStockChangeAsync(MenuItem item, int? quantity, bool? isAvailableOverride)
    {
        var previousQuantity = item.Quantity;
        var previousAvailable = item.IsAvailable;

        if (quantity.HasValue)
            item.Quantity = quantity.Value;

        if (isAvailableOverride.HasValue)
            item.IsAvailable = isAvailableOverride.Value;
        else if (quantity.HasValue)
            item.IsAvailable = item.Quantity > 0;

        await _repository.UpdateAsync(item);

        if (previousQuantity == item.Quantity && previousAvailable == item.IsAvailable)
        {
            _logger.LogWarning("No inventory event published for MenuItem {MenuItemId}. Prev: {Prev}, Curr: {Curr}, Avail: {Avail}",
                item.Id, previousQuantity, item.Quantity, item.IsAvailable);
            return;
        }

        if (previousQuantity > 0 && item.Quantity == 0)
        {
            await _publishEndpoint.Publish(new InventoryItemDepleted(item.Id, item.Quantity, item.IsAvailable,
                _tenant.RestaurantId, _tenant.LocationId));
            _logger.LogInformation("Published InventoryItemDepleted for MenuItemId {MenuItemId}", item.Id);
        }
        else if (previousQuantity == 0 && item.Quantity > 0)
        {
            await _publishEndpoint.Publish(new InventoryItemRestocked(item.Id, item.Quantity, item.IsAvailable,
                _tenant.RestaurantId, _tenant.LocationId));
            _logger.LogInformation("Published InventoryItemRestocked for MenuItemId {MenuItemId}", item.Id);
        }
        else
        {
            await _publishEndpoint.Publish(new InventoryItemUpdated(item.Id, item.Quantity, item.IsAvailable,
                _tenant.RestaurantId, _tenant.LocationId));
            _logger.LogInformation("Published InventoryItemUpdated for MenuItemId {MenuItemId}", item.Id);
        }
    }
}
