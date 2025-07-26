using System.Reflection;
using Common.Library.Settings;
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
        services.AddMassTransit(configure =>
        {
            // consumption of message
            // any consumer classes that are in the assembly will be registered here 
            configure.AddConsumers(Assembly.GetEntryAssembly());
            configure.UsingRestaurantPosRabbitMq(configureRetries);
        }); 
        return services;
    }
    
    public static void UsingRestaurantPosRabbitMq(this IBusRegistrationConfigurator configure, 
        Action<IRetryConfigurator>? configureRetries = null)
    {
        configure.UsingRabbitMq((context, configurator) =>
        {
            // context can get the configuration 
            var configuration = context.GetRequiredService<IConfiguration>();
            var serviceSettings = configuration.GetRequiredSection(nameof(ServiceSettings)).Get<ServiceSettings>(); 
            var rabbitMqSettings = configuration
                .GetRequiredSection(nameof(RabbitMqSettings)).Get<RabbitMqSettings>();
            configurator.Host(rabbitMqSettings!.Host);
            configurator.ConfigureEndpoints(context, new 
                KebabCaseEndpointNameFormatter(serviceSettings!.ServiceName, false));
            
            if (configureRetries == null)
            {
                configureRetries = (retryConfigurator) =>
                {
                    retryConfigurator.Interval(3,  TimeSpan.FromSeconds(5));
                };
            }
            configurator.UseMessageRetry(configureRetries);
        });
    }
}