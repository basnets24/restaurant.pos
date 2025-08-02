using Common.Library;
using InventoryService.Entities;
using MassTransit;
using Messaging.Contracts.Events.Inventory;


namespace InventoryService.Services;

public class InventoryManager
{
    private readonly IRepository<InventoryItem> _repository;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ILogger<InventoryManager> _logger;

    public InventoryManager(
        IRepository<InventoryItem> repository,
        IPublishEndpoint publishEndpoint,
        ILogger<InventoryManager> logger)
    {
        _repository = repository;
        _publishEndpoint = publishEndpoint;
        _logger = logger;
    }

    public async Task<InventoryItem> CreateOrUpdateAsync(CreateInventoryItemDto dto)
    {
        var existing = await _repository.GetAsync(i => i.MenuItemId == dto.MenuItemId);
        InventoryItem item;

        if (existing is null)
        {
            item = new InventoryItem
            {
                Id = Guid.NewGuid(),
                MenuItemId = dto.MenuItemId,
                MenuItemName = dto.MenuItemName,
                Quantity = dto.Quantity,
                IsAvailable = dto.Quantity > 0,
                AcquiredDate = DateTimeOffset.UtcNow
            };
            await _repository.CreateAsync(item);
        }
        else
        {
            existing.Quantity += dto.Quantity;
            existing.IsAvailable = existing.Quantity > 0;
            item = existing;
            await _repository.UpdateAsync(item);
        }

        await PublishInventoryEventsAsync(item);

        return item;
    }

    public async Task UpdateAsync(Guid id, UpdateInventoryItemDto dto)
    {
        var item = await _repository.GetAsync(id);
        if (item is null) throw new InvalidOperationException("Item not found.");

        var previousQuantity = item.Quantity;

        if (dto.Quantity.HasValue)
            item.Quantity = dto.Quantity.Value;

        if (dto.IsAvailable.HasValue)
            item.IsAvailable = dto.IsAvailable.Value;

        await _repository.UpdateAsync(item);

        // Event only if availability changed
        if (previousQuantity == 0 && item.Quantity > 0)
        {
            await _publishEndpoint.Publish(new InventoryItemRestocked(item.MenuItemId, item.Quantity, item.IsAvailable));
            _logger.LogInformation("Published InventoryItemRestocked for MenuItemId {MenuItemId}", item.MenuItemId);
        }
        else if (previousQuantity > 0 && item.Quantity == 0)
        {
            await _publishEndpoint.Publish(new InventoryItemDepleted(item.MenuItemId, item.Quantity, item.IsAvailable));
            _logger.LogInformation("Published InventoryItemDepleted for MenuItemId {MenuItemId}", item.MenuItemId);
        }
    }

    private async Task PublishInventoryEventsAsync(InventoryItem item)
    {
        if (item.Quantity > 0)
        {
            await _publishEndpoint.Publish(new InventoryItemRestocked(item.MenuItemId, item.Quantity, item.IsAvailable));
            _logger.LogInformation("Published InventoryItemRestocked for MenuItemId {MenuItemId}", item.MenuItemId);
        }
        else
        {
            await _publishEndpoint.Publish(new InventoryItemDepleted(item.MenuItemId, item.Quantity, item.IsAvailable));
            _logger.LogInformation("Published InventoryItemDepleted for MenuItemId {MenuItemId}", item.MenuItemId);
        }
    }
}
