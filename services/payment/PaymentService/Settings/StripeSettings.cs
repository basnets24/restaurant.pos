namespace PaymentService.Settings;

public sealed class StripeSettings
{
    public string SecretKey { get; set; } = default!;
    public string WebhookSecret { get; set; } = default!;
    public int WebhookToleranceMinutes { get; set; } = 5;
}