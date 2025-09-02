namespace Messaging.Contracts.Events.Sagas;

public record PaymentTimeoutExpired
{
    public Guid CorrelationId { get; init; }
}