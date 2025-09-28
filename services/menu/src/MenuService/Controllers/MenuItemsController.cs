using Common.Library;
using Common.Library.Tenancy;
using MassTransit;
using MenuService.Auth;
using MenuService.Entities;
using Messaging.Contracts.Events.Menu;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MenuService.Controllers;


[ApiController]
[Route("menu-items")]
public class MenuItemsController : Controller
{
    private readonly IRepository<MenuItem> _repository;
    private readonly IPublishEndpoint _publishEndpoint;
    private readonly ITenantContext _tenant;

    public MenuItemsController(IRepository<MenuItem> repository,
        IPublishEndpoint publishEndpoint,
        ITenantContext tenant)
    {
        _repository = repository;
        _publishEndpoint = publishEndpoint;
        _tenant = tenant;
    }

    [HttpGet]
    [Authorize(Policy = MenuPolicyExtensions.ReadPolicy)]
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
    [Authorize(Policy = MenuPolicyExtensions.ReadPolicy)]
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
    [Authorize(Policy = MenuPolicyExtensions.WritePolicy)]
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

        return CreatedAtAction(nameof(GetByIdAsync), new { id = menuItem.Id }, menuItem.ToDto());
    }

    [HttpPatch("{id}")]
    [Authorize(Policy = MenuPolicyExtensions.WritePolicy)]
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
        return Ok(menuItem.ToDto());
    }


    [HttpDelete("{id}")]
    [Authorize(Policy = MenuPolicyExtensions.WritePolicy)]
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
        return NoContent();
    }

    // GET /menu-items/categories
    [HttpGet("categories")]
    [Authorize(Policy = MenuPolicyExtensions.ReadPolicy)]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<string>>> GetCategoriesAsync()
    {
        return Ok(await Task.FromResult(MenuCategories.All));
    }

    [HttpPost("{id:guid}:availability")]
    [Authorize(Policy = MenuPolicyExtensions.WritePolicy)]
    public async Task<IActionResult> SetAvailabilityAsync(Guid id, [FromBody] bool isAvailable)
    {
        var menuItem = await _repository.GetAsync(id);
        if (menuItem is null) return NotFound();

        menuItem.IsAvailable = isAvailable;
        await _repository.UpdateAsync(menuItem);

        await _publishEndpoint.Publish(new MenuItemUpdated(
            menuItem.Id, menuItem.Name, menuItem.Description, menuItem.Price, menuItem.Category,
            menuItem.IsAvailable, _tenant.RestaurantId, _tenant.LocationId));

        return NoContent();
    }
}