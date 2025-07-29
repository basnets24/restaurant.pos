using Common.Library;
using MassTransit;
using OrderService.Entities;
using Messaging.Contracts.Events.Inventory;


namespace OrderService.Consumers;

public class InventoryItemRestockedConsumer : IConsumer<InventoryItemRestocked>
{
    private readonly IRepository<InventoryItem> _inventoryRepo;
    private readonly ILogger<InventoryItemRestockedConsumer> _logger;

    public InventoryItemRestockedConsumer(
        IRepository<InventoryItem> inventoryRepo,
        ILogger<InventoryItemRestockedConsumer> logger)
    {
        _inventoryRepo = inventoryRepo;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<InventoryItemRestocked> context)
    {
        var msg = context.Message; 
        var inventoryItem = await _inventoryRepo.GetAsync(item=> item.MenuId == msg.MenuItemId);
        if (inventoryItem is null)
        {
            var item = new InventoryItem
            {
                MenuId = msg.MenuItemId,
                Quantity = msg.newQuantity,
                IsAvailable = msg.isAvailable
            };
            await _inventoryRepo.CreateAsync(item); 
            _logger.LogInformation("Inventory item cache in OrderService created for MenuItemId {MenuItemId} with quantity {Quantity}",
                msg.MenuItemId,msg.newQuantity);
        }
        else
        {
            inventoryItem.Quantity = msg.newQuantity;
            inventoryItem.IsAvailable = msg.isAvailable;
            await _inventoryRepo.UpdateAsync(inventoryItem);
            _logger.LogInformation("Inventory item cache in OrderService updated for MenuItemId {MenuItemId} with quantity {Quantity}",
                msg.MenuItemId,msg.newQuantity);
        }
    }
}