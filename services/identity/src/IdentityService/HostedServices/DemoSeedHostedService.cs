using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using IdentityService.Entities;
using Tenant.Domain;
using Tenant.Domain.Data;
using Tenant.Domain.Entities;

namespace IdentityService.HostedServices;

/// <summary>Seeds the "Momo &amp; Burger" restaurant used by the recruiter-facing Admin/Customer
/// Demo buttons on the landing page (see OidcClients.DemoAdmin and
/// services/frontend/src/features/landing/demoCredentials.ts, which must match the values below).
/// Runs once, gated on the restaurant row already existing - re-running is a no-op. Must run
/// after <see cref="TenantDatabaseMigrationHostedService"/> so the tenant tables exist.</summary>
public class DemoSeedHostedService : IHostedService
{
    public const string RestaurantId = "momo-and-burger";
    public const string LocationId = "main";

    public const string AdminEmail = "admin@momoandburger.com";
    private const string AdminPassword = "Demo@Admin123";
    private const string DinerEmail = "diner@momoandburger.com";
    private const string DinerPassword = "Demo@Diner123";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DemoSeedHostedService> _logger;

    public DemoSeedHostedService(IServiceScopeFactory scopeFactory, ILogger<DemoSeedHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var tenantDb = scope.ServiceProvider.GetRequiredService<TenantDbContext>();

        if (await tenantDb.Restaurants.AnyAsync(r => r.Id == RestaurantId, ct))
        {
            _logger.LogDebug("Demo restaurant {RestaurantId} already seeded; skipping", RestaurantId);
            return;
        }

        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        tenantDb.Restaurants.Add(new Restaurant
        {
            Id = RestaurantId,
            Name = "Momo & Burger",
            Slug = RestaurantId,
            Cuisine = "Nepali-American Fusion",
            IsActive = true
        });
        tenantDb.Locations.Add(new Location
        {
            Id = LocationId,
            RestaurantId = RestaurantId,
            Name = "Main",
            Address = "1428 Fusion Ave, San Jose, CA",
            DisplayDistanceMiles = 1.2m,
            EstimatedPickupMinutes = 15,
            IsDiscoverable = true,
            IsActive = true
        });

        var admin = await CreateUserAsync(userManager, AdminEmail, AdminPassword, "Admin Demo", ct);
        AddMembership(tenantDb, admin.Id, TenantRoles.TenantAdmin, TenantRoles.TenantOwner);

        var manager = await CreateUserAsync(userManager, "manager@momoandburger.com", "Demo@Manager123", "Priya Manager", ct);
        AddMembership(tenantDb, manager.Id, TenantRoles.TenantManager);

        var server = await CreateUserAsync(userManager, "server@momoandburger.com", "Demo@Server123", "Raj Server", ct);
        AddMembership(tenantDb, server.Id, TenantRoles.TenantServer);

        // Diner: intentionally no RestaurantMembership - diners are ordinary users
        // distinguished only by the absence of one (see TenantProfileService).
        await CreateUserAsync(userManager, DinerEmail, DinerPassword, "Demo Diner", ct, isDiner: true);

        await tenantDb.SaveChangesAsync(ct);
        _logger.LogInformation("Seeded demo restaurant {RestaurantId} with admin/manager/server/diner accounts", RestaurantId);
    }

    private async Task<ApplicationUser> CreateUserAsync(
        UserManager<ApplicationUser> userManager, string email, string password, string displayName,
        CancellationToken ct, bool isDiner = false)
    {
        var existing = await userManager.FindByEmailAsync(email);
        if (existing is not null) return existing;

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            DisplayName = displayName,
            EmailConfirmed = true,
            CurrentRestaurantId = isDiner ? null : RestaurantId,
            CurrentLocationId = isDiner ? null : LocationId
        };

        var result = await userManager.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to create demo user {email}: {string.Join("; ", result.Errors.Select(e => e.Description))}");
        }

        return user;
    }

    private static void AddMembership(TenantDbContext tenantDb, Guid userId, params string[] roles)
    {
        tenantDb.RestaurantMemberships.Add(new RestaurantMembership
        {
            UserId = userId,
            RestaurantId = RestaurantId,
            DefaultLocationId = LocationId
        });
        foreach (var role in roles)
        {
            tenantDb.RestaurantUserRoles.Add(new RestaurantUserRole
            {
                UserId = userId,
                RestaurantId = RestaurantId,
                RoleName = role
            });
        }
    }

    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}
