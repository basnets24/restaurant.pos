using OrderService.Dtos;
using OrderService.Entities;

namespace OrderService.Interfaces;

public interface IOrderService
{
    Task MarkPaidAsync(Guid orderId, CancellationToken ct = default);

    /// <param name="reason">Why, in words the diner will read - it becomes the body of their
    /// cancellation notification. Null for an ordinary cancel, where the fact is the whole story;
    /// set by the sweep, where "your order was cancelled" without "because it went unpaid" would
    /// look like the restaurant turned it down.</param>
    Task CancelAsync(Guid orderId, string? reason = null, CancellationToken ct = default);

    Task<Order> FinalizeOrderAsync(
        FinalizeOrderDto dto, 
        Guid? idempotencyKey, 
        CancellationToken cancellationToken = default);
}