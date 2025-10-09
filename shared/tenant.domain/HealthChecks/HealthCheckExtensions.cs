using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Tenant.Domain.HealthChecks;

public static class HealthCheckExtensions
{
    public static IServiceCollection ConfigureTenantPostgres(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        var section = configuration.GetRequiredSection("PostgresSettings");
        services.Configure<Settings.PostgresSettings>(section);
        return services;
    }

    public static IHealthChecksBuilder AddPostgresHealthCheck(
        this IHealthChecksBuilder builder,
        string name = "postgres",
        IEnumerable<string>? tags = null)
    {
        ArgumentNullException.ThrowIfNull(builder);

        return builder.AddCheck<PostgresHealthCheck>(
            name,
            tags: tags?.ToArray());
    }
}
