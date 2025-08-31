namespace Messaging.Contracts.Events.Payment;

public record PaymentRequested(Guid CorrelationId, Guid OrderId, long AmountCents);
public record PaymentSucceeded(Guid CorrelationId, Guid OrderId);
public record PaymentFailed(Guid CorrelationId, Guid OrderId, string Reason);

public record PaymentSessionCreated(Guid CorrelationId, Guid OrderId, string CheckoutUrl);