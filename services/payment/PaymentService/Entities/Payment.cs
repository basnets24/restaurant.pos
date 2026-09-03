using Common.Library;
using Common.Library.Tenancy;

namespace PaymentService.Entities;

public class Payment : IEntity, ITenantEntity
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Guid CorrelationId { get; set; }
    /// <summary>Identifies the current payment attempt. Reset to a new value and persisted
    /// *before* a retry starts talking to Stripe, so a reader that polls mid-retry sees a
    /// cleared ClientSecret (attempt invalidated) instead of the previous attempt's stale one.
    /// ConfirmPayment rejects a confirm whose attemptId doesn't match the current one.</summary>
    public Guid AttemptId { get; set; } = Guid.NewGuid();
    /// <summary>The diner who owns this payment, or null when staff are taking it at the POS.
    /// This service holds no order data, so this is the only thing standing between a diner and
    /// someone else's client secret - see the ownership check in PaymentSessionController.</summary>
    public Guid? CustomerId { get; set; }
    public long Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public string Status { get; set; } = "Pending"; // Pending|Succeeded|Failed
    public string Provider { get; set; } = "Demo";  // or "Stripe"
    // Stripe PaymentIntent Id
    public string? PaymentIntentId { get; set; }
    // Client secret for the PaymentIntent, used by Stripe Elements to confirm client-side
    public string? ClientSecret { get; set; }
    // Receipt URL (when available)
    public string? ReceiptUrl { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string RestaurantId { get; set; } = default!;
    public string LocationId { get; set; } = default!;
}
