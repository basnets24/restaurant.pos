using System.Reflection;
using Common.Library.Settings;
using Common.Library.Tenancy;
using MassTransit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Common.Library.MassTransit;

public static class Extensions
{
    public static IServiceCollection AddMassTransitWithRabbitMq(
        this IServiceCollection services,
        Action<IRetryConfigurator>? configureRetries = null)
    {
        services.AddTenantBusTenancy();

        services.AddMassTransit(cfg =>
        {
            cfg.AddDelayedMessageScheduler();

            //  GetEntryAssembly can be null in some hosts
            var entryAssembly = Assembly.GetEntryAssembly();
            if (entryAssembly is not null)
                cfg.AddConsumers(entryAssembly);

            cfg.UsingRestaurantPosRabbitMq(configureRetries);
        });

        return services;
    }

    // Existing overload – delegates to the new one without a custom bus hook
    public static void UsingRestaurantPosRabbitMq(
        this IBusRegistrationConfigurator configure,
        Action<IRetryConfigurator>? configureRetries = null)
        => UsingRestaurantPosRabbitMq(configure, configureRetries, null);

    // New overload – allows callers to add explicit endpoints (e.g., projector with partitioner)
    public static void UsingRestaurantPosRabbitMq(
        this IBusRegistrationConfigurator configure,
        Action<IRetryConfigurator>? configureRetries,
        // this here is the hook
        Action<IBusRegistrationContext, IRabbitMqBusFactoryConfigurator>? configureBus)
    {
        configure.UsingRabbitMq((context, bus) =>
        {
            var configuration   = context.GetRequiredService<IConfiguration>();
            var serviceSettings = configuration.GetRequiredSection(nameof(ServiceSettings)).Get<ServiceSettings>()!;
            var rabbit          = configuration.GetRequiredSection(nameof(RabbitMqSettings)).Get<RabbitMqSettings>()!;

            // Host config (expand if you have vhost/user/pass)
            //bus.Host(rabbit.Host /*, h => { h.Username(...); h.Password(...); } */);

            // Bus middleware
            bus.UseTenantPropagation(context);
            bus.UseDelayedMessageScheduler();

            // Custom endpoints provided by the caller (e.g., pos-read-model-projector)
            configureBus?.Invoke(context, bus);

            // Global retry (single call; includes default if none supplied)
            bus.UseMessageRetry(configureRetries ?? (r => r.Interval(3, TimeSpan.FromSeconds(5))));

            // Auto configure remaining consumers with service-specific kebab-case naming
            bus.ConfigureEndpoints(
                context,
                new KebabCaseEndpointNameFormatter(serviceSettings.ServiceName, false));
        });
    }
}
