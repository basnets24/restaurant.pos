namespace PaymentService;

public sealed class CreateCheckoutRequest
{
    public string? OrderId { get; set; }
    /// Amount in the smallest currency unit (e.g., cents)
    public long? Amount { get; set; }
    public string Currency { get; set; } = "usd";
    public string? Description { get; set; }
}


public sealed class ConfirmResponse
{
    public string? OrderId { get; set; }
    public long? Amount { get; set; }
    public string? Currency { get; set; }
    public string? Status { get; set; }
    public string? ReceiptUrl { get; set; }
}


