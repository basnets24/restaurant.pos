namespace Messaging.Contracts.Events.Payment;

/// <param name="CustomerId">The diner this payment belongs to, or null for a staff-taken
/// payment. This is the payment service's only source of ownership: it has no order data of
/// its own, so without this it can only authorize on the payment.read scope - which every
/// diner holds - and an order id is a bare GUID. Optional so the staff path, where nobody
/// owns the payment, keeps publishing unchanged.</param>
public record PaymentRequested(Guid CorrelationId, Guid OrderId,
    Guid TableId,
    long AmountCents,
    string RestaurantId,
    string LocationId,
    Guid? CustomerId = null);
public record PaymentSucceeded(Guid CorrelationId, Guid OrderId,
    string RestaurantId,
    string LocationId);
public record PaymentFailed(Guid CorrelationId, Guid OrderId, string Reason,
    string RestaurantId,
    string LocationId);

public record PaymentSessionCreated(Guid CorrelationId, Guid OrderId, string ClientSecret,
    string RestaurantId,
    string LocationId);
