using MassTransit;
using Messaging.Contracts.Events.Inventory;
using Messaging.Contracts.Events.Order;
using Messaging.Contracts.Events.Payment;

namespace OrderService.StateMachines;

public class OrderStateMachine : MassTransitStateMachine<OrderState>
{
    public State InventoryPending { get; } = null!;
    public State PaymentPending { get; private set; } = null!;
    public State Completed { get; private set; } = null!;
    public State Rejected { get; private set; } = null!;
    
    public Event<OrderSubmitted> OrderSubmitted { get; private set; } = null!;
    public Event<InventoryReserved> InventoryReserved { get; private set; } = null!;
    public Event<InventoryReserveFaulted> InventoryReserveFaulted { get; private set; } = null!;
    public Event<PaymentSucceeded> PaymentSucceeded { get; private set; } = null!;
    public Event<PaymentFailed> PaymentFailed { get; private set; } = null!;
    
    private readonly ILogger<OrderStateMachine> _logger;

    public OrderStateMachine(ILogger<OrderStateMachine> logger)
    {
        _logger = logger;
        
        InstanceState(x => x.CurrentState);
        
        ConfigureEvents();
        ConfigureInitial();
        ConfigureInventoryPending();
        ConfigurePaymentPending();
        ConfigureCompleted();
        ConfigureRejected();
    }

    private void ConfigureEvents()
    {
        Event(() => OrderSubmitted);
        Event(() => InventoryReserved, x => x.CorrelateById(context => context.Message.CorrelationId));
        Event(() => InventoryReserveFaulted, x => x.CorrelateById(context => context.Message.CorrelationId));
        Event(() => PaymentSucceeded, x => x.CorrelateById(context => context.Message.CorrelationId));
        Event(() => PaymentFailed, x => x.CorrelateById(context => context.Message.CorrelationId));
    }
    
    private void ConfigureInitial()
    {
        Initially(
            // submit order 
            When(OrderSubmitted)
                .Then(context =>
                    {
                        context.Saga.OrderId = context.Message.OrderId;
                        context.Saga.Items = context.Message.Items;
                        context.Saga.OrderTotal = context.Message.TotalAmount;
                        context.Saga.SubmittedAt = DateTimeOffset.Now;
                        context.Saga.LastUpdated = context.Saga.SubmittedAt;
                        _logger.LogInformation("Order submitted with ID {OrderId}", context.Saga.OrderId);
                    })
                .Send(context =>
                    // send a message to inventory to reserve 
                    new ReserveInventory(
                        context.Saga.CorrelationId,
                        context.Saga.OrderId,
                        context.Saga.Items))
                .TransitionTo(InventoryPending)
                // could have a possible exception here, but the controller
                // already checks the local cache for availability and quantity
        ); 
    }
    
    private void ConfigureInventoryPending()
    {
       During(InventoryPending,
           Ignore(OrderSubmitted),
           When(InventoryReserved)
               .Then(context =>
               {
                   context.Saga.LastUpdated = DateTimeOffset.Now;
                   context.Saga.InventoryCheckedAt = context.Saga.LastUpdated;
                   _logger.LogInformation("Inventory reserved for order {OrderId}", context.Saga.OrderId);
               })
               // send a message to payment service 
               .Send( context => new PaymentRequested(
                   context.Saga.CorrelationId,
                   context.Saga.OrderId,
                   context.Saga.OrderTotal
                   ))
               .TransitionTo(PaymentPending), 
           When(InventoryReserveFaulted)
               .Then(context =>
               {
                   context.Saga.LastUpdated = DateTimeOffset.UtcNow;
                   context.Saga.ErrorMessage = context.Message.Reason;
                   _logger.LogWarning("Inventory reservation failed for OrderId {OrderId}: {Reason}",
                       context.Saga.OrderId, context.Message.Reason);
               })
               .TransitionTo(Rejected)
           );
    }

    private void ConfigurePaymentPending()
    {
        During(PaymentPending,
            Ignore(OrderSubmitted),
            Ignore(InventoryReserved),
            When(PaymentSucceeded)
                .Then(context =>
                    {
                        context.Saga.LastUpdated = DateTimeOffset.UtcNow;
                        context.Saga.PaymentProcessedAt = context.Saga.LastUpdated;
                        _logger.LogInformation("Payment succeeded for OrderId {OrderId}", context.Saga.OrderId);
                    })
                .TransitionTo(Completed),
            When(PaymentFailed)
                .Then(context =>
                {
                    context.Saga.LastUpdated = DateTimeOffset.UtcNow;
                    context.Saga.ErrorMessage = context.Message.Reason;
                    _logger.LogWarning("Payment failed for OrderId {OrderId}: {Reason}",
                        context.Saga.OrderId, context.Message.Reason);
                })
                .Send(context =>
                    // compensating messages send to inventory for subtracting items 
                    new ReleaseInventory(
                        context.Saga.CorrelationId,
                        context.Saga.OrderId,
                        context.Saga.Items))
            .TransitionTo(Rejected)
            );
    }
    
    private void ConfigureCompleted()
    {
        During(Completed,
            Ignore(OrderSubmitted),
            Ignore(InventoryReserved),
            Ignore(PaymentSucceeded));
    }
    
    private void ConfigureRejected()
    {
        During(Rejected,
            Ignore(OrderSubmitted),
            Ignore(InventoryReserveFaulted),
            Ignore(PaymentFailed));
    }
    
}