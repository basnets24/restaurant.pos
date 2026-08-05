using System.Security.Claims;
using Duende.IdentityServer.Models;
using Duende.IdentityServer.Services;
using IdentityService.Features.Shared.Constants;
using IdentityService.Features.Tenancy.Services.Claims;

namespace IdentityService.Features.Tenancy.Services;

public class TenantProfileService : IProfileService
{
    private readonly ITenantClaimsProvider _claims;
    private readonly ILogger<TenantProfileService> _logger;

    public const string RestaurantIdClaim = "restaurant_id";
    public const string LocationIdClaim = "location_id";

    public TenantProfileService(ITenantClaimsProvider claims, ILogger<TenantProfileService> logger)
    { _claims = claims; _logger = logger; }

    public async Task GetProfileDataAsync(ProfileDataRequestContext context, CancellationToken cancellationToken)
    {
        var subjectId = context.Subject.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(subjectId) || !Guid.TryParse(subjectId, out var userId))
        {
            _logger.LogWarning("Skipping profile enrichment: missing or invalid subject claim 'sub' value '{SubjectId}'", subjectId);
            return;
        }

        // The diner client is deliberately never issued tenant/role claims (diners have no
        // RestaurantMembership by design) - but Catalog/Order/Payment's ApiResource.UserClaims
        // all list role/restaurant_id/location_id, and the `diner` scope is tied to all three,
        // so RequestedClaimTypes ends up wanting them regardless of the identity scopes actually
        // requested. Without this gate, a staff account authenticating through the diner client
        // (same ApplicationUser store, see OidcClients.Diner) would leak its real tenant/role
        // claims onto an otherwise diner-scoped token.
        if (context.Application?.Identifier == OidcClients.Diner)
        {
            _logger.LogDebug("Skipping tenant/role claim enrichment for diner client, user {UserId}", userId);
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

        var claims = await _claims.GetAsync(userId, cancellationToken);
        if (claims is null)
        {
            // The diner client already returned above, so reaching here with no membership
            // means a staff account genuinely has none - worth a warning, not the routine case.
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

    public Task IsActiveAsync(IsActiveContext context, CancellationToken cancellationToken)
    {
        // user activity is handled by ASP.NET Identity; we don’t gate by tenant here
        context.IsActive = true;
        return Task.CompletedTask;
    }
}
