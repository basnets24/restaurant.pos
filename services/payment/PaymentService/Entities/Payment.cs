using Common.Library;

namespace PaymentService.Entities;

public class Payment : IEntity
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Guid CorrelationId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public string Status { get; set; } = "Pending"; // Pending|Succeeded|Failed
    public string Provider { get; set; } = "Demo";  // or "Stripe"
    public string? ProviderRef { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}