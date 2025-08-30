using OrderService.Dtos;
using OrderService.Entities;

namespace OrderService.Interfaces;

public interface IOrderService
{
    Task MarkPaidAsync(Guid orderId, CancellationToken ct = default);
    
    Task<Order> FinalizeOrderAsync(
        FinalizeOrderDto dto, 
        Guid? idempotencyKey, 
        CancellationToken cancellationToken = default);
}