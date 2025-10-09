using System.Reflection;
using Common.Library.MassTransit;
using Common.Library.Settings;
using MassTransit;
using Messaging.Contracts.Events.Inventory;
using Messaging.Contracts.Events.Menu;
using Messaging.Contracts.Events.Payment;
using OrderService.Projections;   // PosReadModelProjector
using OrderService.Settings;
using OrderService.StateMachines;

namespace OrderService.Extensions;

/// <summary>
/// MassTransit registration extensions for the Order Service.
/// - Configures RabbitMQ bus (host, retries, tenant propagation, delayed scheduler)
/// - Registers all consumers in this assembly
/// - Adds the Order saga with Mongo persistence
/// - Maps endpoint conventions for request/response
/// - Adds an explicit receive endpoint for the POS read-model projector with a shared partitioner
/// </summary>
public static class MassTransitExtensions
{
    /// <summary>
    /// Adds MassTransit with RabbitMQ, saga persistence, auto consumer registration,
    /// endpoint conventions, and an explicit projector endpoint ("pos-read-model-projector")
    /// that maintains the compact POS read model.
    /// </summary>
    public static IServiceCollection AddMassTransitWithSaga(
        this IServiceCollection services,
        IConfiguration config)
    {
        services.AddMassTransit(cfg =>
        {
            // Register all IConsumer<T> in this assembly (includes PosReadModelProjector if it lives here)
            cfg.AddConsumers(Assembly.GetEntryAssembly());

            // Saga + persistence
            cfg.AddSagaStateMachine<OrderStateMachine, OrderState>((context, sagaCfg) =>
                sagaCfg.UseInMemoryOutbox(context))
            .MongoDbRepository(r =>
            {
                var service   = config.GetRequiredSection(nameof(ServiceSettings)).Get<ServiceSettings>()!;
                var mongo     = config.GetRequiredSection(nameof(MongoDbSettings)).Get<MongoDbSettings>()!;
                r.Connection   = mongo.GetConnectionString();
                r.DatabaseName = service.ServiceName;
            });

            // Bus + endpoints (uses broker-agnostic helper with RabbitMQ customization hook)
            cfg.UsingRestaurantPosMessageBroker(
                config,
                retry => retry.Interval(3, TimeSpan.FromSeconds(5)),
                configureRabbitBus: (context, bus) =>
                {
                    // --- Explicit endpoint for the POS read-model projector ---
                    // Single endpoint, shared partitioner: ensures per-MenuItemId ordering
                    bus.ReceiveEndpoint("pos-read-model-projector", (IRabbitMqReceiveEndpointConfigurator e) =>
                    {
                        // One consumer class that handles Menu + Inventory events
                        e.ConfigureConsumer<PosReadModelProjector>(context);

                        // Shared partitioner across ALL message types that affect the same MenuItem
                        var partitioner = bus.CreatePartitioner(16);
                        e.UsePartitioner(partitioner, ctx =>
                        {
                            if (ctx.TryGetMessage<MenuItemCreated>(out var created))
                                return created.Message.Id;

                            if (ctx.TryGetMessage<MenuItemUpdated>(out var updated))
                                return updated.Message.Id;

                            if (ctx.TryGetMessage<MenuItemDeleted>(out var deleted))
                                return deleted.Message.Id;

                            if (ctx.TryGetMessage<InventoryItemUpdated>(out var invUpdated))
                                return invUpdated.Message.MenuItemId;

                            if (ctx.TryGetMessage<InventoryItemDepleted>(out var invDepleted))
                                return invDepleted.Message.MenuItemId;

                            if (ctx.TryGetMessage<InventoryItemRestocked>(out var invRestocked))
                                return invRestocked.Message.MenuItemId;

                            return Guid.Empty;
                        });

                        // Throughput & resilience
                        e.PrefetchCount = 64;            // ~4x partitions keeps lanes full
                        e.ConcurrentMessageLimit = 16;   // == partitions
                        e.UseMessageRetry(r => r.Interval(5, TimeSpan.FromMilliseconds(250)));
                    });

                    // NOTE: Any other explicit endpoints can be added here as needed.
                });
        });

        // Strongly-typed request/response mappings (Inventory + Payments)
        var queues = config.GetRequiredSection(nameof(QueueSettings)).Get<QueueSettings>()!;
        EndpointConvention.Map<ReserveInventory>( new Uri(queues.ReserveInventoryQueueAddress));
        EndpointConvention.Map<ReleaseInventory>( new Uri(queues.ReleaseInventoryQueueAddress));
        EndpointConvention.Map<PaymentRequested>( new Uri(queues.PaymentRequestedQueueAddress));

        return services;
    }
}
