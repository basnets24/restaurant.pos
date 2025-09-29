using System;
using System.Threading;
using System.Threading.Tasks;
using IdentityService.Settings;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Npgsql;

namespace IdentityService.HealthChecks;

public sealed class PostgresHealthCheck : IHealthCheck
{
    private readonly PostgresSettings _settings;

    public PostgresHealthCheck(IOptions<PostgresSettings> options)
    {
        ArgumentNullException.ThrowIfNull(options);
        _settings = options.Value ?? throw new InvalidOperationException("Postgres settings are missing.");
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        await using var connection = new NpgsqlConnection(_settings.GetConnectionString());

        try
        {
            await connection.OpenAsync(cancellationToken);
            await using var command = new NpgsqlCommand("SELECT 1", connection);
            await command.ExecuteScalarAsync(cancellationToken);

            return HealthCheckResult.Healthy();
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Postgres ping failed", ex);
        }
    }
}
