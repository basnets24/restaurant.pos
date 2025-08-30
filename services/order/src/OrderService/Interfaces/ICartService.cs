using OrderService.Dtos;
using OrderService.Entities;

namespace OrderService.Interfaces;

public interface ICartService
{
    Task<Cart> GetAsync(Guid id);
    Task<Cart> CreateAsync(Guid? tableId, Guid? customerId, 
        Guid? serverId, string? serverName, 
        int? guestCount);
    Task AddItemAsync(Guid cartId, AddCartItemDto itemDto);
    Task RemoveItemAsync(Guid cartId, Guid menuItemId);
    Task<Guid> CheckoutAsync(Guid cartId, CancellationToken ct = default);
}

/*
 * Why are the return types in ICartService methods wrapped in Task<>?
   Because all the operations involve asynchronous I/O, like:
   Reading/writing to MongoDB
   Publishing messages to RabbitMQ via MassTransit
   so it returns a cart object wrapped in a task
 */