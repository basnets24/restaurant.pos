namespace Messaging.Contracts.Events.Payment;

public record PaymentRequested(Guid OrderId, decimal Amount);
public record PaymentSucceeded(Guid OrderId);
public record PaymentFailed(Guid OrderId, string Reason);