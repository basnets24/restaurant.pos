using OrderService.Entities;

namespace OrderService.Interfaces;

/// <summary>
/// The diner's cross-restaurant order history. Backed by <see cref="CustomerOrderSummary"/>,
/// which is written from the order lifecycle rather than projected off events - producer and
/// consumer are both this service, so an event hop would buy nothing but a delay.
/// </summary>
public interface ICustomerOrderHistory
{
    /// <summary>Writes or refreshes the summary for an order. A no-op for orders with no
    /// customer - a POS table order has no one to show it to.</summary>
    Task RecordAsync(Order order, CancellationToken ct = default);

    /// <summary>Every order this customer has placed, anywhere, newest first.</summary>
    Task<IReadOnlyList<CustomerOrderSummary>> GetForCustomerAsync(
        Guid customerId, CancellationToken ct = default);
}
