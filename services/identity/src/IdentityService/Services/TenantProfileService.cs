using System.Security.Claims;
using Duende.IdentityServer.Models;
using Duende.IdentityServer.Services;
using IdentityService.Data;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Services;

public class 
    
    TenantProfileService : IProfileService
{
    private readonly TenantDbContext _tenantDb;
    private readonly ILogger<TenantProfileService> _logger;

    public const string RestaurantIdClaim = "restaurant_id";
    public const string LocationIdClaim = "location_id";

    public TenantProfileService(TenantDbContext tenantDb, 
        ILogger<TenantProfileService> logger)
    {
        _tenantDb = tenantDb;
        _logger = logger;
    }

    public async Task GetProfileDataAsync(ProfileDataRequestContext context)
    {
        var subjectId = context.Subject.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(subjectId) || !Guid.TryParse(subjectId, out var userId))
            return;

        var requested = context.RequestedClaimTypes?.ToHashSet(StringComparer.Ordinal) ?? new HashSet<string>();
        var wantRestaurant = requested.Count == 0 || requested.Contains(RestaurantIdClaim);
        var wantLocation = requested.Count == 0 || requested.Contains(LocationIdClaim);
        var wantRoles = requested.Count == 0 || requested.Contains("role");

        if (!wantRestaurant && !wantLocation && !wantRoles)
            return;

        var membership = await _tenantDb.RestaurantMemberships
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.CreatedUtc)
            .FirstOrDefaultAsync();

        if (membership is null)
            return; // no tenant yet

        if (wantRestaurant)
        {
            context.IssuedClaims.Add(new Claim(RestaurantIdClaim, membership.RestaurantId));
        }

        if (wantLocation)
        {
            var locId = membership.DefaultLocationId;
            if (string.IsNullOrEmpty(locId))
            {
                locId = await _tenantDb.Locations
                    .AsNoTracking()
                    .Where(l => l.RestaurantId == membership.RestaurantId && l.IsActive)
                    .OrderBy(l => l.CreatedUtc)
                    .Select(l => l.Id)
                    .FirstOrDefaultAsync();
            }

            if (!string.IsNullOrEmpty(locId))
                context.IssuedClaims.Add(new Claim(LocationIdClaim, locId));
        }
        
        context.IssuedClaims.RemoveAll(c => c.Type == "role");
        if (wantRoles)
        {
            var rid = membership.RestaurantId;
            var roles = await _tenantDb.RestaurantUserRoles
                .AsNoTracking()
                .Where(r => r.UserId == userId && r.RestaurantId == rid)
                .Select(r => r.RoleName)
                .Distinct()
                .ToListAsync();

            foreach (var role in roles)
                context.IssuedClaims.Add(new Claim("role", role));
        }

        _logger.LogDebug("Issued tenant claims for user {UserId}: restaurant_id={RestaurantId} location_id={LocationId}", 
            userId, membership.RestaurantId, 
            context.IssuedClaims.FirstOrDefault(c => c.Type == LocationIdClaim)?.Value);
    }

    public Task IsActiveAsync(IsActiveContext context)
    {
        // user activity is handled by ASP.NET Identity; we don’t gate by tenant here
        context.IsActive = true;
        return Task.CompletedTask;
    }
}
