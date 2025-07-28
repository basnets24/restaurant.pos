
using Common.Library;
using InventoryService.Entities;
using MassTransit;
using Messaging.Contracts.Events.Inventory;
using Microsoft.AspNetCore.Mvc;

namespace InventoryService.Controllers;

[ApiController]
[Route("inventory-items")]
public class InventoryItemsController : ControllerBase
{
    private readonly IRepository<InventoryItem> _repository;
    private readonly IPublishEndpoint _publishEndpoint;
    public InventoryItemsController(IRepository<InventoryItem> repository, 
        IPublishEndpoint publishEndpoint)
    {
        _repository = repository;
        _publishEndpoint = publishEndpoint;
    }

    // GET /inventory-items
    [HttpGet]
    public async Task<ActionResult<IEnumerable<InventoryItemDto>>> GetAsync()
    {
        var items = await _repository.GetAllAsync();
        return Ok(items.Select(item => item.ToDto()));
    }

    // GET /inventory-items/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<InventoryItemDto>> GetByIdAsync(Guid id)
    {
        var item = await _repository.GetAsync(id);
        if (item is null) return NotFound();
        return Ok(item.ToDto());
    }

    // POST /inventory-items
    [HttpPost]
    public async Task<ActionResult<InventoryItemDto>> PostAsync(CreateInventoryItemDto dto)
    {
        var item = new InventoryItem
        {
            Id = Guid.NewGuid(),
            MenuItemId = dto.MenuItemId,
            MenuItemName = dto.MenuItemName,
            Quantity = dto.Quantity,
            IsAvailable = dto.Quantity > 0,
            AcquiredDate = DateTimeOffset.UtcNow
        };
        await _repository.CreateAsync(item);
        
        if (item.Quantity > 0)
        {
            await _publishEndpoint.Publish(new InventoryItemRestocked(item.MenuItemId));
        }
        else
        {
            await _publishEndpoint.Publish(new InventoryItemDepleted(item.MenuItemId));
        }
        return CreatedAtAction(nameof(GetByIdAsync), new { id = item.Id }, item.ToDto());
    }

    // PUT /inventory-items/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> PutAsync(Guid id, UpdateInventoryItemDto dto)
    {
        var item = await _repository.GetAsync(id);
        // Save previous state for comparison
        int previousQuantity = item.Quantity;
        bool wasAvailable = item.IsAvailable;
        
        if (item is null) return NotFound();
        if (dto.Quantity.HasValue) item.Quantity = dto.Quantity.Value;
        if (dto.IsAvailable.HasValue) item.IsAvailable = dto.IsAvailable.Value;

        await _repository.UpdateAsync(item);
        if (previousQuantity == 0 && item.Quantity > 0)
        {
            await _publishEndpoint.Publish(new InventoryItemRestocked(item.MenuItemId));
        }
        else if (previousQuantity > 0 && item.Quantity == 0)
        {
            await _publishEndpoint.Publish(new InventoryItemDepleted(item.MenuItemId));
        }
        return NoContent();
    }

    // DELETE /inventory-items/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAsync(Guid id)
    {
        var item = await _repository.GetAsync(id);
        if (item is null) return NotFound();

        await _repository.DeleteAsync(id);
        return NoContent();
    }
    
}
