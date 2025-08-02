using Common.Library;
using Microsoft.AspNetCore.Mvc;
using OrderService.Entities;

namespace OrderService.Controllers;

[ApiController]
[Route("orders")]
public class OrderController : ControllerBase
{
    private readonly ILogger<OrderController> _logger;
    private readonly IRepository<Order> _orderRepo;
    private readonly IRepository<InventoryItem> _inventoryRepo;
    private readonly IRepository<MenuItem> _menuRepo;

    public OrderController(ILogger<OrderController> logger,
        IRepository<Order> orderRepo, 
        IRepository<InventoryItem> inventoryRepo, 
        IRepository<MenuItem> menuRepo)
    {
        _logger = logger;
        _orderRepo = orderRepo;
        _inventoryRepo = inventoryRepo;
        _menuRepo = menuRepo;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetAsync()
    {
        var orders = await _orderRepo.GetAllAsync();
        return Ok(orders.Select(o => o.ToDto())); 
    }
    
    [HttpGet("{id}")]
    public async Task<ActionResult<OrderDto>> GetByIdAsync(Guid id)
    {
        var order = await _orderRepo.GetAsync(id);
        if (order is null) return NotFound();
        return Ok(order.ToDto());
    }

    [HttpPost]
    public async Task<ActionResult<OrderDto>> PostAsync(CreateOrderDto dto)
    {
        var items = new List<OrderItem>();
        foreach (var dtoItem in dto.Items)
        {
            var menuItem = await _menuRepo.GetAsync(dtoItem.MenuItemId);
            if (menuItem is null)
            {
                return BadRequest($"Menu item with ID {dtoItem.MenuItemId} not found.");
            }

            var inventoryItem = await _inventoryRepo.GetAsync(i => i.MenuId == dtoItem.MenuItemId);
            if (inventoryItem is null ||
                !inventoryItem.IsAvailable ||
                inventoryItem.Quantity < dtoItem.Quantity)
            {
                return BadRequest($"Item '{menuItem.Name}' is not available or insufficient stock.");
            }

            var orderItem = new OrderItem
            {
                MenuItemId = menuItem.Id,
                MenuItemName = menuItem.Name,
                Quantity = dtoItem.Quantity,
                UnitPrice = menuItem.Price
            };

            items.Add(orderItem);
        }
        
        var order = new Order
        {
            Id = Guid.NewGuid(),
            Items = items,
            TotalAmount = items.Sum(i => i.Quantity * i.UnitPrice),
            Status = "Pending"
        };
        await _orderRepo.CreateAsync(order);
        return CreatedAtAction(nameof(GetByIdAsync), new { id = order.Id }, order.ToDto());
    }
    
}