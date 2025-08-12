using Microsoft.AspNetCore.Mvc;
using OrderService.Dtos;
using OrderService.Interfaces;

namespace OrderService.Controllers;



[ApiController]
[Route("carts")]
public class CartController : ControllerBase
{
    private readonly ICartService _cartService;

    public CartController(ICartService cartService)
    {
        _cartService = cartService;
    }

    [HttpPost]
    public async Task<ActionResult<CartDto>> CreateCart(CreateCartDto dto)
    {
        var cart = await _cartService.CreateAsync(dto.TableId, dto.CustomerId);
        var dtoItems = cart.Items.Select(i => 
            new CartItemDto(i.MenuItemId, i.MenuItemName, i.Quantity, i.UnitPrice))
            .ToList();
        return Ok(new CartDto(
            cart.Id, 
            cart.TableId, 
            cart.CustomerId, 
            dtoItems, 
            cart.CreatedAt));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CartDto>> GetCart(Guid id)
    {
        var cart = await _cartService.GetAsync(id);
        if (cart == null) return NotFound();
        var dtoItems = cart.Items.Select(i => 
            new CartItemDto(i.MenuItemId, i.MenuItemName, i.Quantity, i.UnitPrice))
            .ToList();
        return Ok(new CartDto(
            cart.Id, 
            cart.TableId, 
            cart.CustomerId, 
            dtoItems, 
            cart.CreatedAt));
    }

    [HttpPost("{id}/items")]
    public async Task<IActionResult> AddItem(Guid id, AddCartItemDto dto)
    {
        await _cartService.AddItemAsync(id, dto);
        return NoContent();
    }

    [HttpDelete("{id}/items/{menuItemId}")]
    public async Task<IActionResult> RemoveItem(Guid id, Guid menuItemId)
    {
        await _cartService.RemoveItemAsync(id, menuItemId);
        return NoContent();
    }

    [HttpPost("{id}/checkout")]
    public async Task<ActionResult<Guid>> Checkout(Guid id)
    {
        var orderId = await _cartService.CheckoutAsync(id);
        return Ok(orderId);
    }
} 