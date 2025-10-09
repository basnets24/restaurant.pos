using System;
using MassTransit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using Common.Library.MassTransit;
using Common.Library.Settings;

namespace Play.Common.OpenTelemetry
{
    public static class Extensions
    {
        public static IServiceCollection AddTracing(
            this IServiceCollection services,
            IConfiguration config)
        {
            ArgumentNullException.ThrowIfNull(services);
            ArgumentNullException.ThrowIfNull(config);

            services.AddOpenTelemetryTracing(builder =>
            {
                var serviceSettings = config.GetRequiredSection(nameof(ServiceSettings))
                                              .Get<ServiceSettings>()
                                          ?? throw new InvalidOperationException("Service settings are missing.");

                builder.AddSource(serviceSettings.ServiceName)
                       .AddSource("MassTransit")
                       .SetResourceBuilder(
                           ResourceBuilder.CreateDefault()
                                .AddService(serviceName: serviceSettings.ServiceName))
                        .AddHttpClientInstrumentation()
                        .AddAspNetCoreInstrumentation()
                        .AddJaegerExporter(options =>
                        {
                            var jaegerSettings = config.GetRequiredSection(nameof(JaegerSettings))
                                                         .Get<JaegerSettings>()
                                                     ?? throw new InvalidOperationException("Jaeger settings are missing.");
                            options.AgentHost = jaegerSettings.Host;
                            options.AgentPort = jaegerSettings.Port;
                        });
            })
            .AddConsumeObserver<ConsumeObserver>();

            return services;
        }

        public static IServiceCollection AddMetrics(
            this IServiceCollection services,
            IConfiguration config)
        {
            ArgumentNullException.ThrowIfNull(services);
            ArgumentNullException.ThrowIfNull(config);

            services.AddOpenTelemetryMetrics(builder =>
            {
                var settings = config.GetRequiredSection(nameof(ServiceSettings))
                                         .Get<ServiceSettings>()
                                     ?? throw new InvalidOperationException("Service settings are missing.");
                builder.AddMeter(settings.ServiceName)
                        .AddMeter("MassTransit")
                        .AddHttpClientInstrumentation()
                        .AddAspNetCoreInstrumentation()
                        .AddPrometheusExporter();
            });            

            return services;
        }
    }
}
