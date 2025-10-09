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
        {
            _logger.LogWarning("Skipping profile enrichment: missing or invalid subject claim 'sub' value '{SubjectId}'", subjectId);
            return;
        }

        var requested = context.RequestedClaimTypes?.ToHashSet(StringComparer.Ordinal) ?? new HashSet<string>();
        var wantRestaurant = requested.Count == 0 || requested.Contains(RestaurantIdClaim);
        var wantLocation = requested.Count == 0 || requested.Contains(LocationIdClaim);
        var wantRoles = requested.Count == 0 || requested.Contains("role");

        if (!wantRestaurant && !wantLocation && !wantRoles)
        {
            _logger.LogDebug("No tenant-related claim types requested for user {UserId}; skipping", userId);
            return;
        }

        var claims = await _claims.GetAsync(userId, CancellationToken.None);
        if (claims is null)
        {
            _logger.LogWarning("No tenant membership/claims resolved for user {UserId}; issuing no tenant/location/role claims", userId);
            return;
        }

        if (wantRestaurant && !string.IsNullOrEmpty(claims.RestaurantId))
            context.IssuedClaims.Add(new Claim(RestaurantIdClaim, claims.RestaurantId));

        if (wantLocation && !string.IsNullOrEmpty(claims.LocationId))
            context.IssuedClaims.Add(new Claim(LocationIdClaim, claims.LocationId));

        var preExistingRoleClaims = context.IssuedClaims.Count(c => c.Type == "role");
        if (preExistingRoleClaims > 0)
        {
            _logger.LogDebug("Replacing {ExistingRoleClaims} pre-existing role claims with tenant-scoped roles for user {UserId}", preExistingRoleClaims, userId);
            context.IssuedClaims.RemoveAll(c => c.Type == "role");
        }
        if (wantRoles)
        {
            foreach (var role in claims.Roles)
                context.IssuedClaims.Add(new Claim("role", role));
            _logger.LogInformation("Issued {TenantRoleCount} tenant role claims for user {UserId}", claims.Roles.Count, userId);
        }

        _logger.LogDebug("Tenant claim summary for user {UserId}: RestaurantId={RestaurantId} LocationId={LocationId} RolesCount={RolesCount}",
            userId,
            claims.RestaurantId,
            context.IssuedClaims.FirstOrDefault(c => c.Type == LocationIdClaim)?.Value,
            context.IssuedClaims.Count(c => c.Type == "role"));
    }

    public Task IsActiveAsync(IsActiveContext context)
    {
        // user activity is handled by ASP.NET Identity; we don’t gate by tenant here
        context.IsActive = true;
        return Task.CompletedTask;
    }
}
