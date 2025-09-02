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
    public async Task<IEnumerable<MenuItemDto>> GetAsync()
    {
        // get the item, convert to dto, send 
       var menuItems = ( await _repository.GetAllAsync()).Select(item => item.ToDto());
        return menuItems; 
    }
    
    [HttpGet("{id}")]
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
        var menuItem = new MenuItem
        {
            Name = item.Name,
            Description = item.Description,
            Price = item.Price,
            Category = item.Category,
            IsAvailable = false,
            CreatedAt = DateTimeOffset.UtcNow
        };
        await _repository.CreateAsync(menuItem);
        await _publishEndpoint.Publish(new MenuItemCreated(
            menuItem.Id,
            menuItem.Name,
            menuItem.Description,
            menuItem.Price,
            menuItem.Category,
            menuItem.IsAvailable,
            _tenant.RestaurantId,
            _tenant.LocationId
            )); 
        
        return CreatedAtAction(nameof(GetByIdAsync), new {id = menuItem.Id}, menuItem.ToDto());
    }
    
    [HttpPut("{id}")]
    [Authorize(Policy = MenuPolicyExtensions.WritePolicy)]
    public async Task<ActionResult<MenuItemDto>> PutAsync(Guid id, UpdateMenuItemDto item)
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

        if (item.Category is not null)
            menuItem.Category = item.Category;
        

        await _repository.UpdateAsync(menuItem);
        await _publishEndpoint.Publish(new MenuItemUpdated(
            menuItem.Id,
            menuItem.Name,
            menuItem.Description,
            menuItem.Price,
            menuItem.Category,
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
}