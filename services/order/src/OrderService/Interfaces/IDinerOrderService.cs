using OrderService.Dtos;
using OrderService.Entities;

namespace OrderService.Interfaces;

public interface IDinerOrderService
{
    /// <summary>Prices a cart without committing it, for the checkout screen.</summary>
    Task<CartEstimateDto> QuoteAsync(DinerCheckoutDto dto, CancellationToken ct = default);

    /// <summary>Prices, commits and fires a diner's cart in one call.</summary>
    Task<DinerCheckoutResultDto> CheckoutAsync(DinerCheckoutDto dto, CancellationToken ct = default);

    /// <summary>Orders belonging to the authenticated diner, newest first.</summary>
    Task<IReadOnlyList<Order>> GetMyOrdersAsync(CancellationToken ct = default);

    /// <summary>One order, but only if it belongs to the authenticated diner.</summary>
    Task<Order> GetMyOrderAsync(Guid orderId, CancellationToken ct = default);
}
