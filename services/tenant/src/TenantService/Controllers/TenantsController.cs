using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Tenant.Domain.Contracts;
using Tenant.Domain.Data;
using Tenant.Domain.Entities;
using TenantService.Contracts;

namespace TenantService.Controllers;

[ApiController]
[Route("tenants")] // /tenants
[Authorize]
public class TenantsController : ControllerBase
{
    private readonly TenantDbContext _tenantDb;
    private readonly ILogger<TenantsController> _logger;

    public TenantsController(TenantDbContext tenantDb, ILogger<TenantsController> logger)
    {
        _tenantDb = tenantDb;
        _logger = logger;
    }

    // GET /tenants/mine  -> all restaurants the user belongs to
    [HttpGet("mine")]
    public async Task<ActionResult<IReadOnlyList<TenantRestaurantDto>>> GetMyTenants(CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirst("sub")?.Value, out var userId))
            return Unauthorized();

        var rids = await _tenantDb.RestaurantMemberships
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .Select(m => m.RestaurantId)
            .Distinct()
            .ToListAsync(ct);

        if (rids.Count == 0) return Ok(Array.Empty<TenantRestaurantDto>());

        var tenants = await _tenantDb.Restaurants
            .AsNoTracking()
            .Where(r => rids.Contains(r.Id))
            .Select(r => new TenantRestaurantDto(r.Id, r.Name, r.Slug, r.IsActive, r.CreatedUtc))
            .ToListAsync(ct);

        return Ok(tenants);
    }

    // GET /tenants/{restaurantId}
    [HttpGet("{restaurantId}")]
    public async Task<ActionResult<object>> GetTenant(string restaurantId, CancellationToken ct)
    {
        var tenant = await _tenantDb.Restaurants.AsNoTracking().FirstOrDefaultAsync(r => r.Id == restaurantId, ct);
        if (tenant is null) return NotFound();

        var locs = await _tenantDb.Locations.AsNoTracking()
            .Where(l => l.RestaurantId == restaurantId)
            .Select(l => new TenantLocationDto(l.Id, l.RestaurantId, l.Name, l.IsActive, l.CreatedUtc, l.TimeZoneId))
            .ToListAsync(ct);

        return Ok(new
        {
            Restaurant = new TenantRestaurantDto(tenant.Id, tenant.Name, tenant.Slug, tenant.IsActive, tenant.CreatedUtc),
            Locations = locs
        });
    }

    // POST /tenants/{restaurantId}/locations  (Admin only)
    [HttpPost("{restaurantId}/locations")]
    public async Task<ActionResult<TenantLocationDto>> CreateLocation(string restaurantId, [FromBody] CreateLocationDto dto, CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirst("sub")?.Value, out var userId)) return Unauthorized();
        if (!await IsTenantAdminAsync(userId, restaurantId, ct)) return Forbid();

        var name = string.IsNullOrWhiteSpace(dto.Name) ? "Main" : dto.Name.Trim();
        var exists = await _tenantDb.Locations.AnyAsync(l => l.RestaurantId == restaurantId && l.Name == name, ct);
        if (exists) return Conflict("Location name already exists for this restaurant.");

        var loc = new Location
        {
            RestaurantId = restaurantId,
            Name = name,
            TimeZoneId = dto.TimeZoneId,
            IsActive = true
        };
        _tenantDb.Locations.Add(loc);
        await _tenantDb.SaveChangesAsync(ct);

        var dtoOut = new TenantLocationDto(loc.Id, loc.RestaurantId, loc.Name, loc.IsActive, loc.CreatedUtc, loc.TimeZoneId);
        return CreatedAtAction(nameof(GetTenant), new { restaurantId }, dtoOut);
    }

    // PUT /tenants/{restaurantId}/locations/{locationId} (Admin only)
    [HttpPut("{restaurantId}/locations/{locationId}")]
    public async Task<IActionResult> UpdateLocation(string restaurantId, string locationId, [FromBody] UpdateLocationDto dto, CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirst("sub")?.Value, out var userId)) return Unauthorized();
        if (!await IsTenantAdminAsync(userId, restaurantId, ct)) return Forbid();

        var loc = await _tenantDb.Locations.FirstOrDefaultAsync(l => l.Id == locationId && l.RestaurantId == restaurantId, ct);
        if (loc is null) return NotFound();

        var newName = string.IsNullOrWhiteSpace(dto.Name) ? loc.Name : dto.Name.Trim();
        if (!string.Equals(newName, loc.Name, StringComparison.Ordinal))
        {
            var dup = await _tenantDb.Locations.AnyAsync(l => l.RestaurantId == restaurantId && l.Name == newName && l.Id != locationId, ct);
            if (dup) return Conflict("Another location with this name exists.");
            loc.Name = newName;
        }
        loc.IsActive = dto.IsActive;
        loc.TimeZoneId = dto.TimeZoneId;

        await _tenantDb.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<bool> IsTenantAdminAsync(Guid userId, string restaurantId, CancellationToken ct)
    {
        return await _tenantDb.RestaurantUserRoles
            .AsNoTracking()
            .AnyAsync(r => r.UserId == userId && r.RestaurantId == restaurantId && r.RoleName == "Admin", ct);
    }
}

