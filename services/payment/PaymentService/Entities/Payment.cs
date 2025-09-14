using Common.Library;
using Common.Library.Tenancy;

namespace PaymentService.Entities;

public class Payment : IEntity, ITenantEntity
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Guid CorrelationId { get; set; }
    public long Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public string Status { get; set; } = "Pending"; // Pending|Succeeded|Failed
    public string Provider { get; set; } = "Demo";  // or "Stripe"
    // Stripe Checkout Session Id
    public string? ProviderRef { get; set; }
    // Stripe PaymentIntent Id
    public string? PaymentIntentId { get; set; }
    // Receipt URL (when available)
    public string? ReceiptUrl { get; set; }
    public string? SessionUrl { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    // Last processed Stripe event id for idempotency
    public string? LastStripeEventId { get; set; }
    public string RestaurantId { get; set; } = default!;
    public string LocationId { get; set; } = default!;
}
