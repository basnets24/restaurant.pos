using IdentityService.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using IdentityService.Entities;
using IdentityService.Settings;

namespace IdentityService.HostedServices;

public class IdentitySeedHostedService : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IdentitySettings _settings;
    private readonly ILogger<IdentitySeedHostedService> _logger;

    public IdentitySeedHostedService(
        IServiceScopeFactory scopeFactory,
        IOptions<IdentitySettings> identityOptions,
        ILogger<IdentitySeedHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _settings = identityOptions.Value;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<ApplicationRole>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        var roles = new[]
        {
            Roles.Admin, 
            Roles.Server, 
            Roles.Chef,
            Roles.Manager,
            Roles.Cashier
        };
        
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new ApplicationRole { Name = role });
        }

        var admin = await userManager.FindByEmailAsync(_settings.AdminUserEmail);
        if (admin is null)
        {
            admin = new ApplicationUser
            {
                UserName = _settings.AdminUserEmail,
                Email = _settings.AdminUserEmail,
                EmailConfirmed = false
            };
            var result = await userManager.CreateAsync(admin, _settings.AdminUserPassword);
            if (result.Succeeded)
                await userManager.AddToRoleAsync(admin, Roles.Admin);
            else
                _logger.LogError("Failed to create admin user: {Errors}", string.Join("; ", result.Errors.Select(e => e.Description)));
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
