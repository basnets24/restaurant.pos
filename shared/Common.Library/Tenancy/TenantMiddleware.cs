using Microsoft.AspNetCore.Http;

namespace Common.Library.Tenancy;

public class TenantMiddleware
{
    // Must match the claim types IdentityService's TenantProfileService issues
    // (Features/Tenancy/Services/TenantProfileService.cs) - a wire-level contract between the
    // two, not an internal API, so a literal here (rather than a cross-project reference) is
    // the same tradeoff already made for scope/claim names like "sub" and "diner" elsewhere.
    private const string RestaurantIdClaim = "restaurant_id";
    private const string LocationIdClaim = "location_id";

    private readonly RequestDelegate _next;
    private readonly string _defaultRestaurant;
    private readonly string _defaultLocation;

    public TenantMiddleware(RequestDelegate next,
        string defaultRestaurant = "acme-bistro",
        string defaultLocation = "sjc-01")
    { _next = next; _defaultRestaurant = defaultRestaurant;
        _defaultLocation = defaultLocation; }

    public async Task Invoke(HttpContext http, TenantContextHolder holder)
    {
        var claimRestaurant = http.User.FindFirst(RestaurantIdClaim)?.Value;
        var claimLocation = http.User.FindFirst(LocationIdClaim)?.Value;

        string rid, lid;
        if (!string.IsNullOrEmpty(claimRestaurant) && !string.IsNullOrEmpty(claimLocation))
        {
            // An authenticated caller whose token carries real tenant claims (staff, or the
            // demo-admin grant) is scoped to exactly the tenant the token says - full stop.
            // X-Restaurant-Id/X-Location-Id headers are NOT consulted for these callers even
            // if present: trusting client-supplied headers over the validated token let any
            // caller with a token for tenant A redirect a write to tenant B just by setting a
            // different header, regardless of which tenant they actually authenticated into.
            rid = claimRestaurant;
            lid = claimLocation;
        }
        else
        {
            // No usable tenant claims - either an anonymous request (public endpoints take
            // restaurantId/locationId as explicit route/query params instead and never
            // consume TenantContextHolder, so this value is inert for them) or a diner-scoped
            // token, which deliberately carries no restaurant_id/location_id claims at all
            // (TenantProfileService's diner gate) - for diner routes, headers are the only
            // signal available, and that's compensated for elsewhere via per-request
            // CustomerId ownership checks rather than tenant claims. Preserve that design.
            rid = http.Request.Headers["X-Restaurant-Id"].FirstOrDefault() ?? _defaultRestaurant;
            lid = http.Request.Headers["X-Location-Id"].FirstOrDefault() ?? _defaultLocation;
        }

        holder.Set(new TenantContext { RestaurantId = rid, LocationId = lid });
        await _next(http);
    }
    
    public sealed class TenantContextHolder
    {
        private static readonly AsyncLocal<ITenantContext?> _cur = new();
        public void Set(ITenantContext ctx) => _cur.Value = ctx;
        public ITenantContext Current => _cur.Value ?? throw new InvalidOperationException("TenantContext not set");
    }
}