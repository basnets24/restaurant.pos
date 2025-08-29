using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderService.Auth;
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
    [Authorize(Policy = OrderPolicyExtensions.Write)]
    public async Task<ActionResult<CartDto>> CreateCart(CreateCartDto dto)
    {
        var cart = await _cartService.CreateAsync(dto.TableId, dto.CustomerId);
        var dtoItems = cart.Items.Select(i => 
            new CartItemDto(i.MenuItemId, i.MenuItemName, i.Quantity, i.UnitPrice, i.Notes))
            .ToList();
        return Ok(new CartDto(
            cart.Id, 
            cart.TableId, 
            cart.CustomerId, 
            cart.ServerId,
            cart.GuestCount,
            dtoItems, 
            cart.CreatedAt,
            cart.TipAmount,     // null at creation set to 0 
            cart.AppliedTaxes,
            cart.AppliedDiscounts,
            cart.ServiceCharges));
    }

    [HttpGet("{id}")]
    [Authorize(Policy = OrderPolicyExtensions.Read)]
    public async Task<ActionResult<CartDto>> GetCart(Guid id)
    {
        var cart = await _cartService.GetAsync(id);
        if (cart == null) return NotFound();
        var dtoItems = cart.Items.Select(i => 
            new CartItemDto(i.MenuItemId, i.MenuItemName, i.Quantity, i.UnitPrice, i.Notes))
            .ToList();
        return Ok(new CartDto(
            cart.Id, 
            cart.TableId, 
            cart.CustomerId, 
            cart.ServerId,
            cart.GuestCount,
            dtoItems, 
            cart.CreatedAt,
            cart.TipAmount,     // null at creation set to 0 
            cart.AppliedTaxes,
            cart.AppliedDiscounts,
            cart.ServiceCharges));
    }

    [HttpPost("{id}/items")]
    [Authorize(Policy = OrderPolicyExtensions.Write)]
    public async Task<IActionResult> AddItem(Guid id, AddCartItemDto dto)
    {
        await _cartService.AddItemAsync(id, dto);
        return NoContent();
    }

    [HttpDelete("{id}/items/{menuItemId}")]
    [Authorize(Policy = OrderPolicyExtensions.Write)]
    public async Task<IActionResult> RemoveItem(Guid id, Guid menuItemId)
    {
        await _cartService.RemoveItemAsync(id, menuItemId);
        return NoContent();
    }

    [HttpPost("{id}/checkout")]
    [Authorize(Policy = OrderPolicyExtensions.Write)]
    public async Task<ActionResult> Checkout(Guid id)
    {
        var orderId = await _cartService.CheckoutAsync(id);
        return Ok(new { orderId });
    }
} 