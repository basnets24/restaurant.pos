using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Tenant.Domain.Data;

namespace TenantService.Controllers;

[ApiController]
[Route("internal/users")] // internal-only HTTP API for Identity
[Authorize(Policy = "tenant.claims.read")]
public class InternalClaimsController : ControllerBase
{
    private readonly TenantDbContext _tenantDb;

    public InternalClaimsController(TenantDbContext tenantDb) => _tenantDb = tenantDb;

    [HttpGet("{userId:guid}/tenant-claims")]
    public async Task<ActionResult<object>> GetTenantClaims(Guid userId, CancellationToken ct)
    {
        var membership = await _tenantDb.RestaurantMemberships
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.CreatedUtc)
            .FirstOrDefaultAsync(ct);

        if (membership is null)
            return Ok(new { restaurantId = (string?)null, locationId = (string?)null, roles = Array.Empty<string>() });

        var rid = membership.RestaurantId;
        var locId = membership.DefaultLocationId;
        if (string.IsNullOrEmpty(locId))
        {
            locId = await _tenantDb.Locations
                .AsNoTracking()
                .Where(l => l.RestaurantId == rid && l.IsActive)
                .OrderBy(l => l.CreatedUtc)
                .Select(l => l.Id)
                .FirstOrDefaultAsync(ct);
        }

        var roles = await _tenantDb.RestaurantUserRoles
            .AsNoTracking()
            .Where(r => r.UserId == userId && r.RestaurantId == rid)
            .Select(r => r.RoleName)
            .Distinct()
            .ToListAsync(ct);

        return Ok(new { restaurantId = rid, locationId = locId, roles });
    }
}
