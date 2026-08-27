using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Common.Library.HealthChecks;

public class PostgresHealthCheck : IHealthCheck
{
    private readonly DbContext _context;

    public PostgresHealthCheck(DbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var canConnect = await _context.Database.CanConnectAsync(cancellationToken);
            return canConnect
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Unhealthy("Postgres connection check returned false");
        }
        catch (System.Exception ex)
        {
            return HealthCheckResult.Unhealthy("Postgres connection check failed", ex);
        }
    }
}
