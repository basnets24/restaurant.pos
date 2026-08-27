using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderService.Auth;
using OrderService.Dtos;
using OrderService.Interfaces;
using OrderService.Mappers;
using OrderService.Services;

namespace OrderService.Controllers;



[ApiController]
[Route("carts")]
public class CartController : ControllerBase
{
    private readonly ICartService _cartService;
    private readonly IPricingService _pricingService;
    private readonly ICurrentUserAccessor _currentUser;

    public CartController(ICartService cartService,
        IPricingService pricingService,
        ICurrentUserAccessor currentUser)
    {
        _cartService = cartService;
        _pricingService = pricingService;
        _currentUser = currentUser;
    }

    [HttpPost]
    [Authorize(Policy = OrderPolicyExtensions.Write)]
    public async Task<ActionResult<CartDto>> CreateCart(CreateCartDto dto)
    {
        // find the server/manager with order write scope
        var cart = await _cartService.CreateAsync(dto.TableId, dto.CustomerId,
            _currentUser.UserId, _currentUser.DisplayName, dto.GuestCount);
        // determines the estimate
        var newCartDto = cart.ToDto(_pricingService);
        return Ok(newCartDto);
    }

    [HttpGet("{id}")]
    [Authorize(Policy = OrderPolicyExtensions.Read)]
    public async Task<ActionResult<CartDto>> GetCart(Guid id)
    {
        var cart = await _cartService.GetAsync(id);
        if (cart == null) return NotFound();
        var cartDto = cart.ToDto(_pricingService);
        return Ok(cartDto);
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