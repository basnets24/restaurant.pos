using System;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using MongoDB.Driver;

namespace Common.Library.HealthChecks;

public static class Extensions
{
    
    private const string MongoCheckName = "mongodb";
    private const string ReadyTagName = "ready";
    private const string LiveTagName = "live";
    private const int DefaultSeconds = 20;
    private const string HealthEndpoint = "health";
    
    public static IHealthChecksBuilder AddMongoDb(this IHealthChecksBuilder builder,
        TimeSpan? timeout = default)
    {
        ArgumentNullException.ThrowIfNull(builder);

        var registration = new HealthCheckRegistration(
            MongoCheckName,
            serviceProvider =>
            {
                ArgumentNullException.ThrowIfNull(serviceProvider);

                var database = serviceProvider.GetRequiredService<IMongoDatabase>();
                return new MongoDbHealthCheck(database);
            },
            HealthStatus.Unhealthy,
            new[] { ReadyTagName },
            timeout ?? TimeSpan.FromSeconds(DefaultSeconds));

        return builder.Add(registration); 
    }

    public static void MapPosHealthChecks(this IEndpointRouteBuilder endpoints)
    {
        ArgumentNullException.ThrowIfNull(endpoints);

        endpoints.MapHealthChecks($"/{HealthEndpoint}/{ReadyTagName}", new HealthCheckOptions()
        {
            Predicate = (check) => check.Tags.Contains(ReadyTagName)
        });
        endpoints.MapHealthChecks($"/{HealthEndpoint}/{LiveTagName}", new HealthCheckOptions()
        {
            Predicate = (check) => false
        });
    }
}
