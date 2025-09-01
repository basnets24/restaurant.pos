using Microsoft.AspNetCore.Http;

namespace Common.Library.Tenancy;

public class TenantMiddleware
{
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
        var rid = http.Request.Headers["X-Restaurant-Id"].FirstOrDefault() ?? _defaultRestaurant;
        var lid = http.Request.Headers["X-Location-Id"].FirstOrDefault() ?? _defaultLocation;
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