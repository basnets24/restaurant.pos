using Common.Library;
using OrderService.Dtos;
using OrderService.Entities;
using OrderService.Interfaces;
using OrderService.Projections;

namespace OrderService.Services;

public class CartService : ICartService
{
    private readonly IRepository<Cart> _cartRepo;
    private readonly IRepository<DiningTable> _tableRepo;
    private readonly IOrderService _orderService;
    private readonly IRepository<PosCatalogItem> _posCatalog;

    public CartService(IRepository<Cart> cartRepo, 
        IRepository<DiningTable> tableRepo, 
        IOrderService orderService, 
        IRepository<PosCatalogItem> posCatalog)
    {
        _cartRepo = cartRepo;
        _tableRepo = tableRepo;
        _orderService = orderService;
        _posCatalog = posCatalog;
    }

    public async Task<Cart> GetAsync(Guid id)
    {
        var cart = await _cartRepo.GetAsync(id);
        if (cart is null) throw new KeyNotFoundException("Cart not found.");
        return cart; 
    }

    public async Task<Cart> CreateAsync(
        Guid? tableId, 
        Guid? customerId, 
        Guid? serverId,
        string? serverName,
        int? guestCount)
    {
        var cart = new Cart
        {
            Id = Guid.NewGuid(),
            TableId = tableId,
            CustomerId = customerId,
            ServerId = serverId,
            ServerName = serverName,
            GuestCount = guestCount ?? 1,
            CreatedAt = DateTimeOffset.UtcNow
        };
        await _cartRepo.CreateAsync(cart);

        if (tableId.HasValue)
        {
            var table = await _tableRepo.GetAsync(tableId.Value);
            if (table.Status == "Occupied" && table.ActiveCartId != null)
            {
                throw new InvalidOperationException($" {table.Number} is already in use.");
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
        var posItem = await _posCatalog.GetAsync(itemDto.MenuItemId);

        if (posItem is null)
            throw new InvalidOperationException("Menu item not found in catalog.");

        if (!posItem.MenuAvailable || !posItem.InventoryAvailable)
            throw new InvalidOperationException("Item is unavailable.");

        var existing = cart.Items.FirstOrDefault(i => i.MenuItemId == itemDto.MenuItemId);

        // Check against what's already in the cart too, not just this request -
        // otherwise two additions can each pass individually while together
        // exceeding stock.
        var requestedTotal = (existing?.Quantity ?? 0) + itemDto.Quantity;
        if (posItem.Quantity < requestedTotal)
            throw new InvalidOperationException($"Insufficient stock: only {posItem.Quantity} available.");

        if (existing != null)
        {
            existing.Quantity += itemDto.Quantity;
        }
        else
        {
            cart.Items.Add(new CartItem
            {
                MenuItemId = posItem.Id,
                MenuItemName = posItem.Name,
                Quantity = itemDto.Quantity,
                UnitPrice = posItem.BasePrice, 
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

        // Always recompute subtotal from cart items
        var subtotal = cart.Items.Sum(i => i.Quantity * i.UnitPrice);
        
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
            Subtotal = subtotal,
            TableId = cart.TableId,
            ServerId = cart.ServerId,
            ServerName = cart.ServerName,
            GuestCount = cart.GuestCount,
        };
        
        // Using cartId as an idempotency key, so repeated checkouts don’t duplicate orders
        var order = await _orderService.FinalizeOrderAsync(finalizeDto, idempotencyKey: cartId, ct);
        return order.Id;
    }
    

}
