using System.Reflection;
using Common.Library.MassTransit;
using Common.Library.Settings;
using MassTransit;
using Messaging.Contracts.Events.Inventory;
using Messaging.Contracts.Events.Payment;
using OrderService.Dtos;
using OrderService.Entities;
using OrderService.Settings;
using OrderService.StateMachines;

namespace OrderService;

public static class Extensions
{
    public static OrderDto ToDto(this Order order)
    {
        return new OrderDto
        {
            Id = order.Id,
            Items = order.Items,
            TotalAmount = order.TotalAmount,
            Status = order.Status,
            CreatedAt = order.CreatedAt
        };
    }
    
    public static IServiceCollection AddMassTransitWithSaga(this IServiceCollection services, 
        IConfiguration config)
    {
        
        services.AddMassTransit(configure =>
        {
            // saga specific configuration
            configure.UsingRestaurantPosRabbitMq( retryConfigurator =>
            {
                retryConfigurator.Interval(3, TimeSpan.FromSeconds(5));
            });
            // scan entry assembly, find classes that implement IConsumer<T>
            // register them with mass transit consumer
            configure.AddConsumers(Assembly.GetEntryAssembly());
                
            configure.AddSagaStateMachine<OrderStateMachine, OrderState>(
                    (context, sagaConfigurator)  =>
                    {
                        sagaConfigurator.UseInMemoryOutbox(context);
                    })
                .MongoDbRepository( r =>
                {
                    var serviceSettings = config.GetRequiredSection(nameof(ServiceSettings))
                        .Get<ServiceSettings>();
                    var mongoSettings = config.GetRequiredSection(nameof(MongoDbSettings))
                        .Get<MongoDbSettings>();
                    r.Connection = mongoSettings!.GetConnectionString();
                    r.DatabaseName = serviceSettings!.ServiceName;
                });
        });
        var queueSettings = config.GetSection(nameof(QueueSettings)).Get<QueueSettings>();
        EndpointConvention.Map<ReserveInventory>(new Uri(queueSettings!.ReserveInventoryQueueAddress));
        EndpointConvention.Map<ReleaseInventory>( new Uri(queueSettings.ReleaseInventoryQueueAddress));
        EndpointConvention.Map<PaymentRequested>( new Uri(queueSettings.PaymentRequestedQueueAddress));
        
        return services;
    }
}