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
    
    public async Task UpdateAsync(Guid id, UpdateInventoryItemDto dto)
    {
        var item = await _repository.GetAsync(id);
        if (item is null) throw new InvalidOperationException("Item not found.");
        var previous = new InventoryItemState(item.Quantity, item.IsAvailable);
        if (dto.Quantity.HasValue)
            item.Quantity = dto.Quantity.Value + item.Quantity;
        if (dto.IsAvailable.HasValue)
            item.IsAvailable = dto.IsAvailable.Value;
        await _repository.UpdateAsync(item);
        await PublishInventoryEventsAsync(item, previous);
    }
    
    private record InventoryItemState(int Quantity, bool IsAvailable);
    private async Task PublishInventoryEventsAsync(InventoryItem current, InventoryItemState previous)
    {
        if (previous.Quantity == 0 && current.Quantity > 0)
        {
            await _publishEndpoint.Publish(new InventoryItemRestocked(current.MenuItemId, current.Quantity, current.IsAvailable));
            _logger.LogInformation("Published InventoryItemRestocked for MenuItemId {MenuItemId}", current.MenuItemId);
        }
        else if (previous.Quantity > 0 && current.Quantity == 0)
        {
            await _publishEndpoint.Publish(new InventoryItemDepleted(current.MenuItemId, current.Quantity, current.IsAvailable));
            _logger.LogInformation("Published InventoryItemDepleted for MenuItemId {MenuItemId}", current.MenuItemId);
        }
        else if (previous.Quantity != current.Quantity || previous.IsAvailable != current.IsAvailable)
        {
            await _publishEndpoint.Publish(new InventoryItemUpdated(current.MenuItemId, current.Quantity, current.IsAvailable));
            _logger.LogInformation("Published InventoryItemUpdated for MenuItemId {MenuItemId}", current.MenuItemId);
        }
        else
        {
            _logger.LogWarning("No inventory event published for MenuItemId {MenuItemId}. Prev: {Prev}, Curr: {Curr}, Avail: {Avail}",
                current.MenuItemId, previous.Quantity, current.Quantity, current.IsAvailable);
        }
    }
    
    
}
