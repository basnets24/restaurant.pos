using Common.Library.Tenancy;
using MassTransit;
using Messaging.Contracts.Events.Inventory;
using Messaging.Contracts.Events.Order;
using OrderService.Metrics;

namespace OrderService.StateMachines;

public class OrderStateMachine : MassTransitStateMachine<OrderState>
{
    public State InventoryPending { get; } = null!;
    public State Confirmed { get; private set; } = null!;
    public State Rejected { get; private set; } = null!;

    public Event<OrderSubmitted> OrderSubmitted { get; private set; } = null!;
    public Event<InventoryReserved> InventoryReserved { get; private set; } = null!;
    public Event<InventoryReserveFaulted> InventoryReserveFaulted { get; private set; } = null!;

    private readonly ILogger<OrderStateMachine> _logger;


    public OrderStateMachine(ILogger<OrderStateMachine> logger)
    {
        _logger = logger;

        InstanceState(x => x.CurrentState);

        ConfigureEvents();
        ConfigureInitial();
        ConfigureInventoryPending();
        ConfigureConfirmed();
        ConfigureRejected();
    }

    private void ConfigureEvents()
    {
        Event(() => OrderSubmitted);
        Event(() => InventoryReserved, x => x.CorrelateById(context => context.Message.CorrelationId));
        Event(() => InventoryReserveFaulted, x => x.CorrelateById(context => context.Message.CorrelationId));
    }

    private void ConfigureInitial()
    {
        Initially(
            // submit order
            When(OrderSubmitted)
                .Then(context =>
                    {
                        context.Saga.OrderId = context.Message.OrderId;
                        context.Saga.TableId = context.Message.TableId;
                        context.Saga.Items = context.Message.Items;
                        context.Saga.OrderTotal = context.Message.TotalAmount;
                        context.Saga.RestaurantId = context.Message.RestaurantId;
                        context.Saga.LocationId = context.Message.LocationId;
                        context.Saga.SubmittedAt = DateTimeOffset.UtcNow;
                        context.Saga.LastUpdated = context.Saga.SubmittedAt;
                        _logger.LogInformation("Order submitted with ID {OrderId}", context.Saga.OrderId);
                    })
                .Send(context =>
                    // send a message to inventory to reserve
                    new ReserveInventory(
                        context.Saga.CorrelationId,
                        context.Saga.OrderId,
                        context.Saga.Items,
                        context.Saga.RestaurantId,
                        context.Saga.LocationId))
                .TransitionTo(InventoryPending)
        );
    }

    private void ConfigureInventoryPending()
    {
       During(InventoryPending,
           Ignore(OrderSubmitted),
           When(InventoryReserved)
               .Then(context =>
               {
                   context.Saga.LastUpdated = DateTimeOffset.UtcNow;
                   context.Saga.InventoryCheckedAt = context.Saga.LastUpdated;
                   _logger.LogInformation("Inventory reserved for order {OrderId} - fired", context.Saga.OrderId);
                   OrderMetrics.OrdersConfirmed.Add(1);
               })
               .TransitionTo(Confirmed),
           When(InventoryReserveFaulted)
               .Then(context =>
               {
                   context.Saga.LastUpdated = DateTimeOffset.UtcNow;
                   context.Saga.ErrorMessage = context.Message.Reason;
                   _logger.LogWarning("Inventory reservation failed for OrderId {OrderId}: {Reason}",
                       context.Saga.OrderId, context.Message.Reason);
                   OrderMetrics.OrdersRejected.Add(1);
               })
               .TransitionTo(Rejected)
           );
    }

    private void ConfigureConfirmed()
    {
        During(Confirmed,
            Ignore(OrderSubmitted),
            Ignore(InventoryReserved));
    }

    private void ConfigureRejected()
    {
        During(Rejected,
            Ignore(OrderSubmitted),
            Ignore(InventoryReserveFaulted));
    }

}
