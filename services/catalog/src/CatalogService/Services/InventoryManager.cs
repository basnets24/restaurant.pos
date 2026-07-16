using Common.Library;
using Common.Library.Tenancy;
using CatalogService.Entities;
using MassTransit;
using Messaging.Contracts.Events.Inventory;


namespace CatalogService.Services;

public class InventoryManager
{
    private readonly IRepository<InventoryItem> _repository;
    private readonly IRepository<MenuItem> _menuRepository;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ILogger<InventoryManager> _logger;
    private readonly ITenantContext _tenant;

    public InventoryManager(
        IRepository<InventoryItem> repository,
        IRepository<MenuItem> menuRepository,
        IPublishEndpoint publishEndpoint,
        ILogger<InventoryManager> logger,
        ITenantContext tenant)
    {
        _repository = repository;
        _menuRepository = menuRepository;
        _publishEndpoint = publishEndpoint;
        _logger = logger;
        _tenant = tenant;
    }

    public async Task UpdateAsync(Guid id, UpdateInventoryItemDto dto)
    {
        var item = await _repository.GetAsync(id);
        if (item is null) throw new InvalidOperationException("Item not found.");

        var previous = new InventoryItemState(item.Quantity, item.IsAvailable);

        if (dto.Quantity.HasValue)
            item.Quantity = dto.Quantity.Value + item.Quantity;


        if (dto.IsAvailable.HasValue)
            item.IsAvailable = dto.IsAvailable.Value;

        if (previous.Quantity == 0 && item.Quantity > 0 &&
            (dto.IsAvailable == null || dto.IsAvailable.Value == false) )
        {
            // when restocking or first creating
            item.IsAvailable = true;
            await _publishEndpoint.Publish(new InventoryItemRestocked(item.MenuItemId, item.Quantity, item.IsAvailable,
                _tenant.RestaurantId, _tenant.LocationId ));
            _logger.LogInformation("Published InventoryItemRestocked for MenuItemId {MenuItemId}", item.MenuItemId);
            await SyncMenuItemAvailabilityAsync(item.MenuItemId, item.IsAvailable);
        }
        else if (previous.Quantity > 0 && item.Quantity == 0)
        {
            await _publishEndpoint.Publish(new InventoryItemDepleted(item.MenuItemId, item.Quantity, item.IsAvailable,
                _tenant.RestaurantId, _tenant.LocationId));
            _logger.LogInformation("Published InventoryItemDepleted for MenuItemId {MenuItemId}", item.MenuItemId);
            await SyncMenuItemAvailabilityAsync(item.MenuItemId, item.IsAvailable);
        }
        else if (previous.Quantity != item.Quantity || previous.IsAvailable != item.IsAvailable)
        {
            await _publishEndpoint.Publish(new InventoryItemUpdated(item.MenuItemId, item.Quantity, item.IsAvailable,
                _tenant.RestaurantId, _tenant.LocationId));
            _logger.LogInformation("Published InventoryItemUpdated for MenuItemId {MenuItemId}", item.MenuItemId);
            await SyncMenuItemAvailabilityAsync(item.MenuItemId, item.IsAvailable);
        }
        else
        {
            _logger.LogWarning("No inventory event published for MenuItemId {MenuItemId}. Prev: {Prev}, Curr: {Curr}, Avail: {Avail}",
                item.MenuItemId, previous.Quantity, item.Quantity, item.IsAvailable);
        }
        await _repository.UpdateAsync(item);
    }

    private record InventoryItemState(int Quantity, bool IsAvailable);

    // Replaces the old cross-service InventoryItemDepleted/Restocked/Updated consumers
    // that menu used to react to over the broker - now a direct in-process call since
    // both entities live in the same service.
    private async Task SyncMenuItemAvailabilityAsync(Guid menuItemId, bool isAvailable)
    {
        var menuItem = await _menuRepository.GetAsync(menuItemId);
        if (menuItem is null)
        {
            _logger.LogWarning("MenuItem {MenuItemId} not found when syncing availability", menuItemId);
            return;
        }

        if (menuItem.IsAvailable == isAvailable)
            return;

        menuItem.IsAvailable = isAvailable;
        await _menuRepository.UpdateAsync(menuItem);
        _logger.LogInformation("Synced MenuItem {MenuItemId} IsAvailable to {IsAvailable}", menuItemId, isAvailable);
    }
}
