using Common.Library;
using InventoryService.Auth;
using InventoryService.Entities;
using InventoryService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InventoryService.Controllers;

[ApiController]
[Route("inventory-items")]
public class InventoryItemsController : ControllerBase
{
    private readonly IRepository<InventoryItem> _repository;
    private readonly InventoryManager _inventoryManager;
    
    public InventoryItemsController(
        IRepository<InventoryItem> repository, 
         InventoryManager inventoryManager)
    {
        _repository = repository;
        _inventoryManager = inventoryManager;
    }

    [HttpGet]
    [Authorize(Policy = InventoryPolicyExtensions.Read)]
    [ProducesResponseType(typeof(PageResult<InventoryItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResult<InventoryItemDto>>> GetAsync([FromQuery] InventoryQuery q)
    {
        var all = await _repository.GetAllAsync(); // existing method
        var query = all.AsQueryable();

        if (!string.IsNullOrWhiteSpace(q.Name))
        {
            var term = q.Name.Trim();
            query = query.Where(i => i.MenuItemName.Contains(term, StringComparison.OrdinalIgnoreCase));
        }
        if (q.Available.HasValue)
            query = query.Where(i => i.IsAvailable == q.Available.Value);
        if (q.MinQty.HasValue)
            query = query.Where(i => i.Quantity >= q.MinQty.Value);

        var total = query.LongCount();

        var page = Math.Max(1, q.Page);
        var size = Math.Clamp(q.PageSize, 1, 200);

        var items = query
            .OrderBy(i => i.MenuItemName)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(i => i.ToDto())
            .ToList();

        return Ok(new PageResult<InventoryItemDto>(items, page, size, total));
    }

    // GET /inventory-items/{id}
    [HttpGet("{id:guid}")]
    [Authorize(Policy = InventoryPolicyExtensions.Read)]
    public async Task<ActionResult<InventoryItemDto>> GetByIdAsync(Guid id)
    {
        var item = await _repository.GetAsync(id);
        if (item is null) return NotFound();
        return Ok(item.ToDto());
    }

    
    [HttpPut("{id:guid}")]
    [Authorize(Policy = InventoryPolicyExtensions.Write)]
    public async Task<IActionResult> PutAsync(Guid id, UpdateInventoryItemDto dto)
    {
        await _inventoryManager.UpdateAsync(id, dto);
        return NoContent();
    }
    
    // DELETE /inventory-items/{id}
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = InventoryPolicyExtensions.Write)]
    public async Task<IActionResult> DeleteAsync(Guid id)
    {
        var item = await _repository.GetAsync(id);
        if (item is null) return NotFound();

        await _repository.DeleteAsync(id);
        return NoContent();
    }
    
}
