namespace Messaging.Contracts.Events.Payment;

public record PaymentRequested(Guid CorrelationId, Guid OrderId, decimal Amount);
public record PaymentSucceeded(Guid CorrelationId, Guid OrderId);
public record PaymentFailed(Guid CorrelationId, Guid OrderId, string Reason);