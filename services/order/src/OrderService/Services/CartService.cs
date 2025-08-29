using Common.Library;
using OrderService.Dtos;
using OrderService.Entities;
using OrderService.Interfaces;

namespace OrderService.Services;

public class CartService : ICartService
{
    private readonly IRepository<Cart> _cartRepo;
    private readonly IRepository<MenuItem> _menuRepo;
    private readonly IRepository<DiningTable> _tableRepo;
    
    private readonly IOrderService _orderService;

    public CartService(IRepository<Cart> cartRepo, 
        IRepository<MenuItem> menuRepo, 
        IRepository<DiningTable> tableRepo, 
        IOrderService orderService)
    {
        _cartRepo = cartRepo;
        _menuRepo = menuRepo;
        _tableRepo = tableRepo;
        _orderService = orderService;
    }

    public async Task<Cart> GetAsync(Guid id) => await _cartRepo.GetAsync(id);

    public async Task<Cart> CreateAsync(Guid? tableId, Guid? customerId)
    {
        var cart = new Cart
        {
            Id = Guid.NewGuid(),
            TableId = tableId,
            CustomerId = customerId,
            CreatedAt = DateTimeOffset.UtcNow
        };
        await _cartRepo.CreateAsync(cart);

        if (tableId.HasValue)
        {
            var table = await _tableRepo.GetAsync(tableId.Value);
            if (table.Status == "Occupied" && table.ActiveCartId != null)
            {
                throw new InvalidOperationException($"Table {table.TableNumber} is already in use.");
            }

            table.Status = "Occupied";
            table.ActiveCartId = cart.Id;
            await _tableRepo.UpdateAsync(table);
        }
        return cart;
    }

    public async Task AddItemAsync(Guid cartId, AddCartItemDto itemDto)
    {
        var cart = await _cartRepo.GetAsync(cartId);
        var menuItem = await _menuRepo.GetAsync(itemDto.MenuItemId);
        var existing = cart.Items.FirstOrDefault(i => i.MenuItemId == itemDto.MenuItemId);
        if (existing != null)
        {
            existing.Quantity += itemDto.Quantity;
        }
        else
        {
            cart.Items.Add(new CartItem
            {
                MenuItemId = menuItem.Id,
                MenuItemName = menuItem.Name,
                Quantity = itemDto.Quantity,
                UnitPrice = menuItem.Price, 
                Notes = itemDto.Notes 
            });
           
        }
        await _cartRepo.UpdateAsync(cart);
    }

    public async Task RemoveItemAsync(Guid cartId, Guid menuItemId)
    {
        var cart = await _cartRepo.GetAsync(cartId);
        cart.Items.RemoveAll(i => i.MenuItemId == menuItemId);
        await _cartRepo.UpdateAsync(cart);
    }

    public async Task<Guid> CheckoutAsync(Guid cartId, CancellationToken ct)
    {
        var cart = await _cartRepo.GetAsync(cartId);
        if (cart == null) throw new InvalidOperationException("Cart not found.");
        if (!cart.Items.Any()) throw new InvalidOperationException("Cannot checkout an empty cart.");

        var finalizeDto = new FinalizeOrderDto
        {
            Items = cart.Items.Select(i => new OrderItem
            {
                MenuItemId = i.MenuItemId,
                MenuItemName = i.MenuItemName,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                Notes = i.Notes
            }).ToList(),
            TotalAmount = cart.Items.Sum(i => i.Quantity * i.UnitPrice),
            AppliedTaxes = cart.AppliedTaxes,
            AppliedDiscounts = cart.AppliedDiscounts,
            ServiceCharges = cart.ServiceCharges,
            TipAmount = cart.TipAmount,
            TableId = cart.TableId,
            ServerId = cart.ServerId,
            GuestCount = cart.GuestCount
        };
        
        // Using cartId as an idempotency key, so repeated checkouts don’t duplicate orders
        var order = await _orderService.FinalizeOrderAsync(finalizeDto, idempotencyKey: cartId, ct);
        return order.Id;
    }
}