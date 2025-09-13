using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tenant.Domain.Data;
using TenantService.Services;

namespace TenantService.Controllers;

[Authorize]
[ApiController]
[Route("api/onboarding")]
public class OnboardingController : ControllerBase
{
    private readonly RestaurantOnboardingService _svc;
    private readonly IConfiguration _config;
    private readonly ILogger<OnboardingController> _logger;
    private readonly TenantDbContext _tenantDb;

    public OnboardingController(RestaurantOnboardingService svc, IConfiguration config, ILogger<OnboardingController> logger, TenantDbContext tenantDb)
    { _svc = svc; _config = config; _logger = logger; _tenantDb = tenantDb; }

    [HttpPost("restaurant")]
    public async Task<ActionResult<OnboardRestaurantRes>> Create([FromBody] OnboardRestaurantReq req, CancellationToken ct)
    {
        var user = User.FindFirstValue("sub");
        _logger.LogInformation("Create restaurant requested by {UserId} with name {Name}", user, req.Name);
        if (string.IsNullOrWhiteSpace(user) || !Guid.TryParse(user, out var userId))
            return Unauthorized();

        var res = await _svc.OnboardAsync(userId, req, ct);
        _logger.LogInformation("Created restaurant by {UserId} with name {Name}", userId, req.Name);
        return Ok(res);
    }

    [HttpPost("join")]
    public async Task<ActionResult<OnboardRestaurantRes>> Join([FromBody] JoinRestaurantReq req, CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        _logger.LogInformation("Join restaurant requested by {UserId} using code {Code}", userId, req.Code);
        var res = await _svc.JoinByCodeAsync(userId, req.Code, ct);
        return Ok(res);
    }

    [HttpGet("status")]
    public async Task<ActionResult<object>> GetStatus(CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var membership = await _tenantDb.RestaurantMemberships
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.CreatedUtc)
            .FirstOrDefaultAsync(ct);

        if (membership is null)
        {
            return Ok(new { hasMembership = false, isAdmin = false, restaurantId = (string?)null, locationId = (string?)null });
        }

        var locationId = membership.DefaultLocationId;
        if (string.IsNullOrEmpty(locationId))
        {
            locationId = await _tenantDb.Locations
                .AsNoTracking()
                .Where(l => l.RestaurantId == membership.RestaurantId && l.IsActive)
                .OrderBy(l => l.CreatedUtc)
                .Select(l => l.Id)
                .FirstOrDefaultAsync(ct);
        }

        var isAdmin = await _tenantDb.RestaurantUserRoles
            .AsNoTracking()
            .AnyAsync(r => r.UserId == userId
                           && r.RestaurantId == membership.RestaurantId
                           && r.RoleName == "Admin", ct);

        return Ok(new { hasMembership = true, isAdmin, restaurantId = membership.RestaurantId, locationId });
    }

    [HttpGet("me/code")]
    public async Task<ActionResult<object>> GetMyJoinCode(CancellationToken ct)
    {
        var userIdStr = User.FindFirstValue("sub");
        if (string.IsNullOrWhiteSpace(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var code = await _svc.GetMyJoinCodeAsync(userId, ct);
        if (code is null) return NotFound();

        var origins = _config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
        var baseUrl = origins.FirstOrDefault() ?? string.Empty;
        if (baseUrl.EndsWith('/')) baseUrl = baseUrl.TrimEnd('/');
        var slugOrId = string.IsNullOrWhiteSpace(code.Slug) ? code.RestaurantId : code.Slug;
        var joinUrl = string.IsNullOrEmpty(baseUrl) ? null : $"{baseUrl}/join?code={Uri.EscapeDataString(slugOrId)}";

        return Ok(new { restaurantId = code.RestaurantId, slug = code.Slug, joinUrl });
    }
}

