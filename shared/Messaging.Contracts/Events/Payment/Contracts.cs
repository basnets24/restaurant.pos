namespace Messaging.Contracts.Events.Payment;

public record PaymentRequested(Guid CorrelationId, Guid OrderId, long AmountCents,
    string RestaurantId,
    string LocationId);
public record PaymentSucceeded(Guid CorrelationId, Guid OrderId,
    string RestaurantId,
    string LocationId);
public record PaymentFailed(Guid CorrelationId, Guid OrderId, string Reason,
    string RestaurantId,
    string LocationId);

public record PaymentSessionCreated(Guid CorrelationId, Guid OrderId, string CheckoutUrl,
    string RestaurantId,
    string LocationId);