using System.Security.Claims;
using Duende.IdentityServer.Models;
using Duende.IdentityServer.Services;

namespace IdentityService.Services;

public class TenantProfileService : IProfileService
{
    private readonly ITenantClaimsProvider _claims;
    private readonly ILogger<TenantProfileService> _logger;

    public const string RestaurantIdClaim = "restaurant_id";
    public const string LocationIdClaim = "location_id";

    public TenantProfileService(ITenantClaimsProvider claims, ILogger<TenantProfileService> logger)
    { _claims = claims; _logger = logger; }

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

        var claims = await _claims.GetAsync(userId, CancellationToken.None);
        if (claims is null) return;

        if (wantRestaurant && !string.IsNullOrEmpty(claims.RestaurantId))
            context.IssuedClaims.Add(new Claim(RestaurantIdClaim, claims.RestaurantId));

        if (wantLocation && !string.IsNullOrEmpty(claims.LocationId))
            context.IssuedClaims.Add(new Claim(LocationIdClaim, claims.LocationId));

        context.IssuedClaims.RemoveAll(c => c.Type == "role");
        if (wantRoles)
        {
            foreach (var role in claims.Roles)
                context.IssuedClaims.Add(new Claim("role", role));
        }

        _logger.LogDebug("Issued tenant claims for user {UserId}: restaurant_id={RestaurantId} location_id={LocationId}", 
            userId, claims.RestaurantId, context.IssuedClaims.FirstOrDefault(c => c.Type == LocationIdClaim)?.Value);
    }

    public Task IsActiveAsync(IsActiveContext context)
    {
        // user activity is handled by ASP.NET Identity; we don’t gate by tenant here
        context.IsActive = true;
        return Task.CompletedTask;
    }
}
