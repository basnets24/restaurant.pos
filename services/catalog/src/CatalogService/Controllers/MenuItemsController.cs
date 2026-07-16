using Common.Library;
using Common.Library.Tenancy;
using MassTransit;
using CatalogService.Auth;
using CatalogService.Entities;
using Messaging.Contracts.Events.Menu;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CatalogService.Controllers;


[ApiController]
[Route("menu-items")]
public class MenuItemsController : Controller
{
    private readonly IRepository<MenuItem> _repository;
    private readonly IRepository<InventoryItem> _inventoryRepository;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ITenantContext _tenant;
    private readonly ILogger<MenuItemsController> _logger;

    public MenuItemsController(IRepository<MenuItem> repository,
        IRepository<InventoryItem> inventoryRepository,
        IPublishEndpoint publishEndpoint,
        ITenantContext tenant,
        ILogger<MenuItemsController> logger)
    {
        _repository = repository;
        _inventoryRepository = inventoryRepository;
        _publishEndpoint = publishEndpoint;
        _tenant = tenant;
        _logger = logger;
    }

    [HttpGet]
    [Authorize(Policy = CatalogPolicyExtensions.MenuReadPolicy)]
    [ProducesResponseType(typeof(PageResult<MenuItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResult<MenuItemDto>>> GetAsync([FromQuery] MenuQuery q)
    {
        var all = await _repository.GetAllAsync(); // repo doesn’t expose skip/take; in-memory page for now
        var query = all.AsQueryable();

        if (!string.IsNullOrWhiteSpace(q.Name))
        {
            var term = q.Name.Trim();
            query = query.Where(m => (m.Name ?? "").Contains(term, StringComparison.OrdinalIgnoreCase));
        }
        if (!string.IsNullOrWhiteSpace(q.Category))
            query = query.Where(m => string.Equals(m.Category, q.Category, StringComparison.OrdinalIgnoreCase));
        if (q.Available.HasValue)
            query = query.Where(m => m.IsAvailable == q.Available.Value);
        if (q.MinPrice.HasValue) query = query.Where(m => m.Price >= q.MinPrice.Value);
        if (q.MaxPrice.HasValue) query = query.Where(m => m.Price <= q.MaxPrice.Value);

        var total = query.LongCount();
        var page = Math.Max(1, q.Page);
        var size = Math.Clamp(q.PageSize, 1, 200);

        var items = query.OrderBy(m => m.Category).ThenBy(m => m.Name)
            .Skip((page - 1) * size).Take(size)
            .Select(m => m.ToDto()).ToList();

        return Ok(new PageResult<MenuItemDto>(items, page, size, total));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Policy = CatalogPolicyExtensions.MenuReadPolicy)]
    public async Task<ActionResult<MenuItemDto>> GetByIdAsync(Guid id)
    {
        var menuItem = await _repository.GetAsync(id);
        if (menuItem == null)
        {
            return NotFound();
        }
        return menuItem.ToDto();
    }

    [HttpPost]
    [Authorize(Policy = CatalogPolicyExtensions.MenuWritePolicy)]
    public async Task<ActionResult<MenuItemDto>> PostAsync(CreateMenuItemDto item)
    {
        var normalized = MenuCategories.Normalize(item.Category);
        if (normalized is null)
            return BadRequest(new { error = "Invalid category", allowed = MenuCategories.All });
        var menuItem = new MenuItem
        {
            Name = item.Name,
            Description = item.Description,
            Price = item.Price,
            Category = normalized,
            IsAvailable = false,
            CreatedAt = DateTimeOffset.UtcNow,
            RestaurantId = _tenant.RestaurantId,
            LocationId = _tenant.LocationId
        };
        await _repository.CreateAsync(menuItem);
        await _publishEndpoint.Publish(new MenuItemCreated(
            menuItem.Id,
            menuItem.Name,
            menuItem.Description,
            menuItem.Price,
            normalized,
            menuItem.IsAvailable,
            _tenant.RestaurantId,
            _tenant.LocationId
            ));

        // Every menu item gets a linked inventory record (starts at zero stock).
        // Direct in-process call - this used to happen via inventory's
        // MenuItemCreatedConsumer reacting to MenuItemCreated over the broker.
        var inventoryItem = new InventoryItem
        {
            Id = Guid.NewGuid(),
            MenuItemId = menuItem.Id,
            MenuItemName = menuItem.Name,
            Quantity = 0,
            IsAvailable = menuItem.IsAvailable,
            AcquiredDate = DateTimeOffset.UtcNow
        };
        await _inventoryRepository.CreateAsync(inventoryItem);
        _logger.LogInformation("Created InventoryItem for MenuItem {MenuItemName} - {MenuItemId}",
            menuItem.Name, menuItem.Id);

        return CreatedAtAction(nameof(GetByIdAsync), new { id = menuItem.Id }, menuItem.ToDto());
    }

    [HttpPatch("{id}")]
    [Authorize(Policy = CatalogPolicyExtensions.MenuWritePolicy)]
    public async Task<ActionResult<MenuItemDto>> PatchAsync(Guid id, UpdateMenuItemDto item)
    {
        var menuItem = await _repository.GetAsync(id);
        if (menuItem == null)
        {
            return NotFound();
        }

        // Only update fields if they were provided
        if (item.Name is not null)
            menuItem.Name = item.Name;

        if (item.Description is not null)
            menuItem.Description = item.Description;

        if (item.Price is not null)
            menuItem.Price = item.Price.Value;

        var normalized = MenuCategories.Normalize(item.Category);
        if (normalized is null)
            return BadRequest(new { error = "Invalid category", allowed = MenuCategories.All });
        menuItem.Category = normalized;



        await _repository.UpdateAsync(menuItem);
        await _publishEndpoint.Publish(new MenuItemUpdated(
            menuItem.Id,
            menuItem.Name,
            menuItem.Description,
            menuItem.Price,
            normalized,
            menuItem.IsAvailable,
            _tenant.RestaurantId,
            _tenant.LocationId
        ));

        await SyncInventoryItemAsync(menuItem.Id, menuItem.Name, menuItem.IsAvailable);

        return Ok(menuItem.ToDto());
    }


    [HttpDelete("{id}")]
    [Authorize(Policy = CatalogPolicyExtensions.MenuWritePolicy)]
    public async Task<ActionResult> DeleteAsync(Guid id)
    {
        var menuItem = await _repository.GetAsync(id);
        if (menuItem == null)
        {
            return NotFound();
        }
        await _repository.DeleteAsync(id);
        await _publishEndpoint.Publish(new MenuItemDeleted(id,
            _tenant.RestaurantId,
            _tenant.LocationId));

        // Direct in-process call - this used to happen via inventory's
        // MenuItemDeletedConsumer reacting to MenuItemDeleted over the broker.
        var inventoryItem = await _inventoryRepository.GetAsync(i => i.MenuItemId == id);
        if (inventoryItem is not null)
        {
            await _inventoryRepository.DeleteAsync(inventoryItem.Id);
            _logger.LogInformation("Deleted InventoryItem linked to MenuItem: {MenuItemId}", id);
        }

        return NoContent();
    }

    // GET /menu-items/categories
    [HttpGet("categories")]
    [Authorize(Policy = CatalogPolicyExtensions.MenuReadPolicy)]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<string>>> GetCategoriesAsync()
    {
        return Ok(await Task.FromResult(MenuCategories.All));
    }

    [HttpPost("{id:guid}:availability")]
    [Authorize(Policy = CatalogPolicyExtensions.MenuWritePolicy)]
    public async Task<IActionResult> SetAvailabilityAsync(Guid id, [FromBody] bool isAvailable)
    {
        var menuItem = await _repository.GetAsync(id);
        if (menuItem is null) return NotFound();

        menuItem.IsAvailable = isAvailable;
        await _repository.UpdateAsync(menuItem);

        await _publishEndpoint.Publish(new MenuItemUpdated(
            menuItem.Id, menuItem.Name, menuItem.Description, menuItem.Price, menuItem.Category,
            menuItem.IsAvailable, _tenant.RestaurantId, _tenant.LocationId));

        await SyncInventoryItemAsync(menuItem.Id, menuItem.Name, menuItem.IsAvailable);

        return NoContent();
    }

    // Replaces the old cross-service MenuItemUpdatedConsumer that inventory used to
    // react to over the broker - now a direct in-process call since both entities
    // live in the same service.
    private async Task SyncInventoryItemAsync(Guid menuItemId, string name, bool isAvailable)
    {
        var inventoryItem = await _inventoryRepository.GetAsync(i => i.MenuItemId == menuItemId);
        if (inventoryItem is null)
        {
            _logger.LogWarning("InventoryItem not found for MenuItem {MenuItemId}", menuItemId);
            return;
        }

        if (inventoryItem.MenuItemName == name && inventoryItem.IsAvailable == isAvailable)
            return;

        inventoryItem.MenuItemName = name;
        inventoryItem.IsAvailable = isAvailable;
        await _inventoryRepository.UpdateAsync(inventoryItem);
        _logger.LogInformation("Updated InventoryItem for MenuItem {MenuItemName} {MenuItemId}", name, menuItemId);
    }
}
