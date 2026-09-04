using Common.Library;
using Microsoft.EntityFrameworkCore;
using OrderService.Dtos;
using OrderService.Entities;
using OrderService.Exceptions;
using OrderService.Interfaces;
using OrderService.Projections;

namespace OrderService.Services;

public class CartService : ICartService
{
    private readonly IRepository<Cart> _cartRepo;
    private readonly IRepository<DiningTable> _tableRepo;
    private readonly IOrderService _orderService;
    private readonly IRepository<PosCatalogItem> _posCatalog;
    private readonly IRepository<Order> _orderRepo;

    public CartService(IRepository<Cart> cartRepo,
        IRepository<DiningTable> tableRepo,
        IOrderService orderService,
        IRepository<PosCatalogItem> posCatalog,
        IRepository<Order> orderRepo)
    {
        _cartRepo = cartRepo;
        _tableRepo = tableRepo;
        _orderService = orderService;
        _posCatalog = posCatalog;
        _orderRepo = orderRepo;
    }

    // A cart's id doubles as its order's id once checked out (see CheckoutAsync's
    // idempotency key). Mutating the cart after that point is invisible to the
    // guest's bill: checkout is idempotent and won't re-price a changed cart, but
    // nothing stops the kitchen from being fired again for the inflated item list
    // (relying on the frontend's local "already fired" flag isn't enough - it's
    // reset by unrelated kitchen-workflow actions like marking an order served).
    // So refuse the mutation at the source instead of trusting the caller.
    private async Task GuardNotCheckedOutAsync(Guid cartId)
    {
        var order = await _orderRepo.GetAsync(cartId);
        if (order is null) return;
        var terminal = order.Status is OrderStatus.Paid or OrderStatus.Cancelled or OrderStatus.Rejected;
        if (!terminal)
            throw new ConflictException("This order has already been fired to the kitchen and can no longer be changed.");
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
        int? guestCount,
        string orderType = OrderTypes.DineIn,
        DateTimeOffset? pickupTime = null,
        Guid? cartId = null)
    {
        if (guestCount < 1)
            throw new BusinessRuleException("Guest count must be at least 1.");

        DiningTable? table = null;
        if (tableId.HasValue)
        {
            table = await _tableRepo.GetAsync(tableId.Value)
                ?? throw new KeyNotFoundException("Table not found.");
            if (table.Status == DiningTableStatus.Occupied && table.ActiveCartId != null)
            {
                throw new ConflictException($"Table {table.Number} is already in use.");
            }
            if (guestCount is < 1 || guestCount > table.Seats)
            {
                throw new BusinessRuleException($"Guest count must be between 1 and {table.Seats} for table {table.Number}.");
            }
        }

        var cart = new Cart
        {
            Id = cartId ?? Guid.NewGuid(),
            TableId = tableId,
            CustomerId = customerId,
            ServerId = serverId,
            ServerName = serverName,
            GuestCount = guestCount ?? 1,
            OrderType = orderType,
            PickupTime = pickupTime,
            CreatedAt = DateTimeOffset.UtcNow
        };
        await _cartRepo.CreateAsync(cart);

        if (table is not null)
        {
            table.Status = DiningTableStatus.Occupied;
            table.PartySize = guestCount;
            table.ActiveCartId = cart.Id;
            table.Version++;
            try
            {
                await _tableRepo.UpdateAsync(table);
            }
            catch (DbUpdateConcurrencyException)
            {
                // Someone else claimed this table between our read above and this
                // write - the cart we just created has nothing to attach to, so
                // remove it rather than leaving an orphaned cart pointing at a
                // table that never actually linked back to it.
                await _cartRepo.DeleteAsync(cart.Id);
                throw new ConflictException($"Table {table.Number} is already occupied.");
            }
        }
        return cart;
    }

    public async Task AddItemAsync(Guid cartId, AddCartItemDto itemDto)
    {
        await GuardNotCheckedOutAsync(cartId);
        if (itemDto.Quantity <= 0)
            throw new BusinessRuleException("Quantity must be at least 1.");
        var cart = await _cartRepo.GetAsync(cartId)
            ?? throw new KeyNotFoundException("Cart not found.");
        var posItem = await _posCatalog.GetAsync(itemDto.MenuItemId);

        if (posItem is null)
            throw new KeyNotFoundException("Menu item not found in catalog.");

        if (!posItem.MenuAvailable || !posItem.InventoryAvailable)
            throw new BusinessRuleException("Item is unavailable.");

        var existing = cart.Items.FirstOrDefault(i => i.MenuItemId == itemDto.MenuItemId);

        // Check against what's already in the cart too, not just this request -
        // otherwise two additions can each pass individually while together
        // exceeding stock.
        var requestedTotal = (existing?.Quantity ?? 0) + itemDto.Quantity;
        if (posItem.Quantity < requestedTotal)
            throw new BusinessRuleException($"Insufficient stock: only {posItem.Quantity} available.");

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

    /// <summary>
    /// Overwrites a cart's lines in one shot. Used only by the diner path, where the cart is
    /// built entirely client-side and submitted whole - there is no incremental add/remove, so
    /// there is also no line-merging question: the client already collapsed identical
    /// configurations before sending.
    ///
    /// The caller supplies modifier selections it has already resolved against catalog; this
    /// method still owns the base price and the stock check, so a request cannot price its own
    /// line no matter what it puts on the wire.
    /// </summary>
    public async Task ReplaceItemsAsync(Guid cartId, IReadOnlyList<CartLineRequest> lines)
    {
        await GuardNotCheckedOutAsync(cartId);
        var cart = await _cartRepo.GetAsync(cartId)
            ?? throw new KeyNotFoundException("Cart not found.");

        if (lines.Count == 0) throw new BusinessRuleException("Cannot submit an empty cart.");
        if (lines.Any(l => l.Quantity <= 0)) throw new BusinessRuleException("Quantity must be at least 1.");

        var items = new List<CartItem>(lines.Count);

        // Stock is per menu item, but a single item can span several lines here (same burger,
        // different modifiers). Checking each line on its own would let two lines of five pass
        // against a stock of six, so aggregate first and check once per item.
        foreach (var group in lines.GroupBy(l => l.MenuItemId))
        {
            var posItem = await _posCatalog.GetAsync(group.Key)
                ?? throw new KeyNotFoundException("Menu item not found in catalog.");

            if (!posItem.MenuAvailable || !posItem.InventoryAvailable)
                throw new BusinessRuleException($"{posItem.Name} is no longer available.");

            var requested = group.Sum(l => l.Quantity);
            if (posItem.Quantity < requested)
                throw new BusinessRuleException(
                    $"Insufficient stock for {posItem.Name}: only {posItem.Quantity} available.");

            foreach (var line in group)
            {
                items.Add(new CartItem
                {
                    LineId = Guid.NewGuid(),
                    MenuItemId = posItem.Id,
                    MenuItemName = posItem.Name,
                    Quantity = line.Quantity,
                    // Base price comes from the read model, deltas from catalog - never the request.
                    UnitPrice = posItem.BasePrice + line.Modifiers.Sum(m => m.PriceDelta),
                    Notes = string.IsNullOrWhiteSpace(line.Notes) ? null : line.Notes.Trim(),
                    SelectedModifiers = line.Modifiers.ToList()
                });
            }
        }

        cart.Items = items;
        await _cartRepo.UpdateAsync(cart);
    }

    public async Task RemoveItemAsync(Guid cartId, Guid menuItemId)
    {
        await GuardNotCheckedOutAsync(cartId);
        var cart = await _cartRepo.GetAsync(cartId)
            ?? throw new KeyNotFoundException("Cart not found.");
        cart.Items.RemoveAll(i => i.MenuItemId == menuItemId);
        await _cartRepo.UpdateAsync(cart);
    }

    public async Task<Guid> CheckoutAsync(Guid cartId, CancellationToken ct)
    {
        var cart = await _cartRepo.GetAsync(cartId)
            ?? throw new KeyNotFoundException("Cart not found.");
        if (!cart.Items.Any()) throw new BusinessRuleException("Cannot checkout an empty cart.");

        // Always recompute subtotal from cart items
        var subtotal = cart.Items.Sum(i => i.Quantity * i.UnitPrice);
        
        var finalizeDto = new FinalizeOrderDto
        {
            Items = cart.Items.Select(i => new OrderItem
            {
                LineId = i.LineId,
                MenuItemId = i.MenuItemId,
                MenuItemName = i.MenuItemName,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice,
                Notes = i.Notes,
                SelectedModifiers = i.SelectedModifiers
            }).ToList(),
            Subtotal = subtotal,
            TableId = cart.TableId,
            ServerId = cart.ServerId,
            ServerName = cart.ServerName,
            CustomerId = cart.CustomerId,
            GuestCount = cart.GuestCount,
            OrderType = cart.OrderType,
            PickupTime = cart.PickupTime,
        };
        
        // Using cartId as an idempotency key, so repeated checkouts don’t duplicate orders
        var order = await _orderService.FinalizeOrderAsync(finalizeDto, idempotencyKey: cartId, ct);
        return order.Id;
    }
    

}
