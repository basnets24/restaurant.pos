using Microsoft.EntityFrameworkCore;
using Tenant.Domain.Data;

namespace IdentityService.Tenancy.HostedServices;

/// <summary>
/// Hosted service that automatically applies pending tenant-schema database migrations on startup.
/// This ensures the tenant database schema is always up-to-date when the service starts.
/// </summary>
public class TenantDatabaseMigrationHostedService : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TenantDatabaseMigrationHostedService> _logger;

    public TenantDatabaseMigrationHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<TenantDatabaseMigrationHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var tenantDbContext = scope.ServiceProvider.GetRequiredService<TenantDbContext>();

        _logger.LogInformation("Applying pending tenant database migrations...");

        try
        {
            await tenantDbContext.Database.MigrateAsync(cancellationToken);
            _logger.LogInformation("Tenant database migrations applied successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to apply tenant database migrations");
            throw; // Fail fast if migrations fail
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
