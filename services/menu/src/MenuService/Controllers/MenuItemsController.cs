using Common.Library;
using MenuService.Entities;
using Microsoft.AspNetCore.Mvc;

namespace MenuService.Controllers;


[ApiController]
[Route("menu-items")]
public class MenuItemsController : Controller 
{
    private readonly IRepository<MenuItem> _repository;

    public MenuItemsController(IRepository<MenuItem> repository)
    {
        _repository = repository;
    }
    
    [HttpGet]
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
    public async Task<ActionResult<MenuItemDto>> PostAsync(CreateMenuItemDto item)
    {
        var menuItem = new MenuItem
        {
            Name = item.Name,
            Description = item.Description,
            Price = item.Price,
            Category = item.Category,
            IsAvailable = item.IsAvailable,
            CreatedAt = DateTimeOffset.UtcNow
        };
        await _repository.CreateAsync(menuItem);
        return CreatedAtAction(nameof(GetByIdAsync), new {id = menuItem.Id}, menuItem.ToDto());
    }
    
    [HttpPut("{id}")]
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

        if (item.IsAvailable is not null)
            menuItem.IsAvailable = item.IsAvailable.Value;

        await _repository.UpdateAsync(menuItem);

        return Ok(menuItem.ToDto());
    }
    
    
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteAsync(Guid id)
    {
        var menuItem = await _repository.GetAsync(id);
        if (menuItem == null)
        {
            return NotFound();
        }
        await _repository.DeleteAsync(id);
        return NoContent();
    }
}