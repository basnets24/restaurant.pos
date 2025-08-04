namespace OrderService.Settings;

public class QueueSettings
{
    public string ReserveInventoryQueueAddress { get; init; } = null!;
    public string ReleaseInventoryQueueAddress { get; init; } = null!;
    public string PaymentRequestedQueueAddress { get; init; } = null!;
}