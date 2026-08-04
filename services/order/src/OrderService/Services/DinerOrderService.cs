using Common.Library;
using Common.Library.Tenancy;
using OrderService.Dtos;
using OrderService.Entities;
using OrderService.Exceptions;
using OrderService.Interfaces;

namespace OrderService.Services;

/// <summary>
/// The diner side of ordering. Staff keep the deliberate two-step flow - fire now, pay later,
/// because a table order legitimately sits unpaid - while a diner gets a single call that
/// commits the order; payment follows automatically once inventory is actually reserved
/// (see <c>InventoryReservedConsumer</c>).
/// </summary>
public class DinerOrderService : IDinerOrderService
{
    private readonly ICartService _carts;
    private readonly ICatalogMenuClient _catalog;
    private readonly IRepository<Cart> _cartRepo;
    private readonly IRepository<Order> _orders;
    private readonly ICurrentUserAccessor _currentUser;
    private readonly ITenantContext _tenant;
    private readonly ILogger<DinerOrderService> _logger;

    public DinerOrderService(
        ICartService carts,
        ICatalogMenuClient catalog,
        IRepository<Cart> cartRepo,
        IRepository<Order> orders,
        ICurrentUserAccessor currentUser,
        ITenantContext tenant,
        ILogger<DinerOrderService> logger)
    {
        _carts = carts;
        _catalog = catalog;
        _cartRepo = cartRepo;
        _orders = orders;
        _currentUser = currentUser;
        _tenant = tenant;
        _logger = logger;
    }

    public async Task<DinerCheckoutResultDto> CheckoutAsync(DinerCheckoutDto dto, CancellationToken ct = default)
    {
        var customerId = _currentUser.UserId;

        if (dto.Items.Count == 0) throw new BusinessRuleException("Your cart is empty.");
        if (dto.PickupTime is { } pickup && pickup < DateTimeOffset.UtcNow.AddMinutes(-1))
            throw new BusinessRuleException("Pickup time cannot be in the past.");

        // A retried checkout - double-tapped button, flaky connection - must return the order
        // it already placed. Without this the cart guard downstream would 409 a request whose
        // order actually succeeded, telling the diner it failed when the kitchen already has it.
        if (await AlreadyPlacedAsync(dto.CartId, customerId) is { } placed)
        {
            _logger.LogInformation("Returning existing order {OrderId} for replayed checkout", placed.Id);
            return new DinerCheckoutResultDto(placed.Id, placed.GrandTotal, placed.Status);
        }

        var menu = await _catalog.GetModifiersAsync(_tenant.RestaurantId, _tenant.LocationId, ct);
        var lines = dto.Items.Select(line => Resolve(line, menu)).ToList();

        var cart = await GetOrCreateCartAsync(dto, customerId);
        await _carts.ReplaceItemsAsync(cart.Id, lines);

        var orderId = await _carts.CheckoutAsync(cart.Id, ct);
        var order = await _orders.GetAsync(orderId)
            ?? throw new InvalidOperationException($"Order {orderId} vanished immediately after checkout.");

        _logger.LogInformation("Diner {CustomerId} placed pickup order {OrderId} for {GrandTotal}",
            customerId, orderId, order.GrandTotal);

        return new DinerCheckoutResultDto(order.Id, order.GrandTotal, order.Status);
    }

    public async Task<IReadOnlyList<Order>> GetMyOrdersAsync(CancellationToken ct = default)
    {
        var customerId = _currentUser.UserId;
        var orders = await _orders.GetAllAsync(o => o.CustomerId == customerId);
        return orders.OrderByDescending(o => o.CreatedAt).ToList();
    }

    public async Task<Order> GetMyOrderAsync(Guid orderId, CancellationToken ct = default)
    {
        var order = await _orders.GetAsync(orderId);

        // Not-found and belongs-to-someone-else deliberately return the same 404: an order id
        // is a bare GUID in a URL, and a 403 would confirm which ones exist.
        if (order is null || order.CustomerId != _currentUser.UserId)
            throw new KeyNotFoundException("Order not found.");

        return order;
    }

    /// <summary>
    /// The order this cart already produced, if any. A cart id doubles as its order's id, so
    /// this is a direct lookup. Returns null for a cart that was never checked out.
    ///
    /// The CustomerId check matters even though the caller supplied the id: without it, posting
    /// arbitrary GUIDs would report back other people's order totals and statuses.
    /// </summary>
    private async Task<Order?> AlreadyPlacedAsync(Guid cartId, Guid customerId)
    {
        var order = await _orders.GetAsync(cartId);
        return order is not null && order.CustomerId == customerId ? order : null;
    }

    /// <summary>
    /// The cart id comes from the client so a retried checkout lands on the same cart and
    /// therefore the same order (<c>CheckoutAsync</c> uses the cart id as its idempotency key).
    /// That means the id is attacker-chosen, so an existing cart must be proven to belong to
    /// this diner before it is reused - otherwise one diner could overwrite another's cart, or
    /// hijack a staff cart mid-service.
    /// </summary>
    private async Task<Cart> GetOrCreateCartAsync(DinerCheckoutDto dto, Guid customerId)
    {
        var existing = await _cartRepo.GetAsync(dto.CartId);
        if (existing is not null)
        {
            if (existing.CustomerId != customerId)
                throw new KeyNotFoundException("Cart not found.");
            return existing;
        }

        return await _carts.CreateAsync(
            tableId: null,
            customerId: customerId,
            serverId: null,
            serverName: null,
            // Left unset (CartService defaults it to 1). GuestCount only drives the auto-gratuity
            // rule, which needs a party of six - a pickup order must never trip it.
            guestCount: null,
            orderType: OrderTypes.Pickup,
            pickupTime: dto.PickupTime,
            cartId: dto.CartId);
    }

    /// <summary>Turns a requested line into a priced one, rejecting anything the menu does not
    /// actually offer. Every rule here exists because the request is untrusted input.</summary>
    private static CartLineRequest Resolve(
        DinerCheckoutLineDto line,
        IReadOnlyDictionary<Guid, MenuItemModifiers> menu)
    {
        if (!menu.TryGetValue(line.MenuItemId, out var item))
            throw new BusinessRuleException("One of the items in your cart is no longer available.");

        var selected = new List<SelectedModifier>();
        var remaining = new HashSet<Guid>(line.OptionIds);

        foreach (var group in item.Groups)
        {
            var chosen = line.OptionIds.Where(group.Options.ContainsKey).ToList();
            remaining.ExceptWith(chosen);

            if (group.Required && chosen.Count == 0)
                throw new BusinessRuleException($"{item.Name}: please choose a {group.Name}.");

            if (group.SelectionType == "Single" && chosen.Count > 1)
                throw new BusinessRuleException($"{item.Name}: only one {group.Name} may be chosen.");

            selected.AddRange(chosen.Select(id => group.Options[id]));
        }

        // Left over means the id belongs to no group on this item - a stale cart from before a
        // menu change, or a hand-crafted request. Either way it must not be priced.
        if (remaining.Count > 0)
            throw new BusinessRuleException($"{item.Name}: one of the selected options is no longer offered.");

        return new CartLineRequest(line.MenuItemId, line.Quantity, line.Notes, selected);
    }
}
