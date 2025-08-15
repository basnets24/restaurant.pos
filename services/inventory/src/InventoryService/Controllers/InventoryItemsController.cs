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

    // GET /inventory-items
    [HttpGet]
    [Authorize(Policy = InventoryPolicyExtensions.Read)]
    public async Task<ActionResult<IEnumerable<InventoryItemDto>>> GetAsync()
    {
        var items = await _repository.GetAllAsync();
        return Ok(items.Select(item => item.ToDto()));
    }

    // GET /inventory-items/{id}
    [HttpGet("{id}")]
    [Authorize(Policy = InventoryPolicyExtensions.Read)]
    public async Task<ActionResult<InventoryItemDto>> GetByIdAsync(Guid id)
    {
        var item = await _repository.GetAsync(id);
        if (item is null) return NotFound();
        return Ok(item.ToDto());
    }

    
    [HttpPut("{id}")]
    [Authorize(Policy = InventoryPolicyExtensions.Write)]
    public async Task<IActionResult> PutAsync(Guid id, UpdateInventoryItemDto dto)
    {
        await _inventoryManager.UpdateAsync(id, dto);
        return NoContent();
    }
    
    // DELETE /inventory-items/{id}
    [HttpDelete("{id}")]
    [Authorize(Policy = InventoryPolicyExtensions.Write)]
    public async Task<IActionResult> DeleteAsync(Guid id)
    {
        var item = await _repository.GetAsync(id);
        if (item is null) return NotFound();

        await _repository.DeleteAsync(id);
        return NoContent();
    }
    
}
