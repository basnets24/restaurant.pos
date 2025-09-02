using MassTransit;
using Messaging.Contracts.Events.Order;

namespace OrderService.StateMachines;

public class OrderState : SagaStateMachineInstance, ISagaVersion
{
    public Guid CorrelationId { get; set; }
    public int Version { get; set; }
    
    public string RestaurantId { get; set; } = default!;
    public string LocationId { get; set; } = default!;
    public string CurrentState { get; set; } = null!;

    public Guid OrderId { get; set; }
    public Guid CustomerId { get; set; }
    
    public List<OrderItemMessage> Items { get; set; } = new();
    public decimal OrderTotal { get; set; }

    public DateTimeOffset SubmittedAt { get; set; }
    // to keep track of when it was last updated
    public DateTimeOffset LastUpdated { get; set; }

    public string? ErrorMessage { get; set; }
    
    public Guid? PaymentTimeoutTokenId { get; set; }

    // Timestamps for tracking
    public DateTimeOffset? InventoryCheckedAt { get; set; }
    public DateTimeOffset? PaymentProcessedAt { get; set; }
    
}