
using Common.Library;
using InventoryService.Entities;
using Microsoft.AspNetCore.Mvc;

namespace InventoryService.Controllers;

[ApiController]
[Route("inventory-items")]
public class InventoryItemsController : ControllerBase
{
    private readonly IRepository<InventoryItem> _repository;
    public InventoryItemsController(IRepository<InventoryItem> repository)
    {
        _repository = repository;
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

        return CreatedAtAction(nameof(GetByIdAsync), new { id = item.Id }, item.ToDto());
    }

    // PUT /inventory-items/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> PutAsync(Guid id, UpdateInventoryItemDto dto)
    {
        var item = await _repository.GetAsync(id);
        if (item is null) return NotFound();

        if (dto.Quantity.HasValue) item.Quantity = dto.Quantity.Value;
        if (dto.IsAvailable.HasValue) item.IsAvailable = dto.IsAvailable.Value;

        await _repository.UpdateAsync(item);

        return NoContent();
    }

    
}
