using OrderService.Dtos;
using OrderService.Entities;

namespace OrderService.Interfaces;

public interface IDinerOrderService
{
    /// <summary>Prices a cart without committing it, for the checkout screen.</summary>
    Task<CartEstimateDto> QuoteAsync(DinerCheckoutDto dto, CancellationToken ct = default);

    /// <summary>Prices, commits and fires a diner's cart in one call.</summary>
    Task<DinerCheckoutResultDto> CheckoutAsync(DinerCheckoutDto dto, CancellationToken ct = default);

    /// <summary>Orders belonging to the authenticated diner at the restaurant in the request
    /// headers, newest first. For every restaurant, see <see cref="GetMyHistoryAsync"/>.</summary>
    Task<IReadOnlyList<Order>> GetMyOrdersAsync(CancellationToken ct = default);

    /// <summary>The diner's orders across every restaurant, newest first. Read off
    /// <c>CustomerOrderSummary</c>, the one order table that is not tenant-scoped.</summary>
    Task<IReadOnlyList<DinerOrderSummaryDto>> GetMyHistoryAsync(CancellationToken ct = default);

    /// <summary>One order, but only if it belongs to the authenticated diner.</summary>
    Task<Order> GetMyOrderAsync(Guid orderId, CancellationToken ct = default);

    /// <summary>Calls off the diner's own order while it is still unpaid, releasing its stock.</summary>
    Task CancelMyOrderAsync(Guid orderId, CancellationToken ct = default);

    /// <summary>The diner's notifications across every restaurant, newest first.</summary>
    Task<IReadOnlyList<DinerNotificationDto>> GetMyNotificationsAsync(int take, CancellationToken ct = default);

    /// <summary>Marks one of the diner's own notifications read.</summary>
    Task MarkNotificationReadAsync(Guid notificationId, CancellationToken ct = default);

    /// <summary>Marks every one of the diner's notifications read.</summary>
    Task MarkAllNotificationsReadAsync(CancellationToken ct = default);
}
