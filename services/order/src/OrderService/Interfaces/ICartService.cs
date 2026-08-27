using OrderService.Dtos;
using OrderService.Entities;

namespace OrderService.Interfaces;

public interface ICartService
{
    Task<Cart> GetAsync(Guid id);
    Task<Cart> CreateAsync(Guid? tableId, Guid? customerId,
        Guid? serverId, string? serverName,
        int? guestCount,
        string orderType = OrderTypes.DineIn,
        DateTimeOffset? pickupTime = null,
        Guid? cartId = null);
    Task AddItemAsync(Guid cartId, AddCartItemDto itemDto);
    Task ReplaceItemsAsync(Guid cartId, IReadOnlyList<CartLineRequest> lines);
    Task RemoveItemAsync(Guid cartId, Guid menuItemId);
    Task<Guid> CheckoutAsync(Guid cartId, CancellationToken ct = default);
}

/// <summary>One requested cart line with its modifier selections already resolved against
/// catalog. Prices on <paramref name="Modifiers"/> are server-resolved, not client-supplied.</summary>
public record CartLineRequest(
    Guid MenuItemId,
    int Quantity,
    string? Notes,
    IReadOnlyList<SelectedModifier> Modifiers);

/*
 * Why are the return types in ICartService methods wrapped in Task<>?
   Because all the operations involve asynchronous I/O, like:
   Reading/writing to Postgres
   Publishing messages to RabbitMQ via MassTransit
   so it returns a cart object wrapped in a task
 */