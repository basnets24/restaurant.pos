using System.Reflection;
using Common.Library.MassTransit;
using Common.Library.Settings;
using MassTransit;
using Messaging.Contracts.Events.Inventory;
using Messaging.Contracts.Events.Payment;
using MongoDB.Driver;
using OrderService.Dtos;
using OrderService.Entities;
using OrderService.Hubs;
using OrderService.Interfaces;
using OrderService.Services;
using OrderService.Settings;
using OrderService.StateMachines;

namespace OrderService;

public static class Extensions
{
    
    public static void AddTablesModule(this IServiceCollection services)
    {
    // CORS for SignalR (allow your UI origins)
        services.AddCors(opt =>
        {
            opt.AddPolicy("pos-ui", b => b
                .WithOrigins(
                    "http://localhost:5173", // Vite/Next dev
                    "http://localhost:3000"
                )
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials());
        });


    // SignalR with useful defaults (JSON casing preserved)
        services.AddSignalR(options =>
            {
                options.EnableDetailedErrors = true;
                options.KeepAliveInterval = TimeSpan.FromSeconds(15);
                options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
            })
            .AddJsonProtocol(o =>
            {
                o.PayloadSerializerOptions.PropertyNamingPolicy = null;
            });
        
        // .AddStackExchangeRedis("localhost:6379", opt => { opt.Configuration.ChannelPrefix = "signalr"; }); // optional scale-out

    
        services.AddScoped<IDiningTableService, DiningTableService>();
    }
    
    public static void MapTablesModule(this WebApplication app)
    {
    // Ensure app.UseRouting() / app.UseAuthentication() / app.UseAuthorization() is configured in Program.cs
    // Apply CORS to the hub endpoint
        app.MapHub<FloorHub>("/hubs/floor").RequireCors("pos-ui");
    // Controllers are discovered via MinimalHosting defaults
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