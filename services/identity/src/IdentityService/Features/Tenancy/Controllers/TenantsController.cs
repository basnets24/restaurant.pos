using Duende.IdentityServer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using IdentityService.Features.Tenancy.DTOs;
using IdentityService.Features.Tenancy.Services;
using IdentityService.Common.Extensions;

namespace IdentityService.Features.Tenancy.Controllers;

[ApiController]
[Route("tenants")]
[Authorize(Policy = IdentityServerConstants.LocalApi.PolicyName)]
public class TenantsController : ControllerBase
{
    private readonly ITenantService _tenantService;
    private readonly ILogger<TenantsController> _logger;

    public TenantsController(ITenantService tenantService, ILogger<TenantsController> logger)
    {
        _tenantService = tenantService;
        _logger = logger;
    }

    [HttpGet("mine")]
    public async Task<ActionResult<IReadOnlyList<TenantRestaurantDto>>> GetMyTenants(CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId))
            return Unauthorized();

        var tenants = await _tenantService.GetMyTenantsAsync(userId, ct);
        return Ok(tenants);
    }

    [HttpGet("{restaurantId}")]
    public async Task<ActionResult<object>> GetTenant(string restaurantId, CancellationToken ct)
    {
        var tenant = await _tenantService.GetTenantAsync(restaurantId, ct);
        if (tenant is null) return NotFound();

        return Ok(tenant);
    }

    [HttpPost("{restaurantId}/locations")]
    public async Task<ActionResult<TenantLocationDto>> CreateLocation(string restaurantId, [FromBody] CreateLocationDto dto, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId))
            return Unauthorized();

        try
        {
            var location = await _tenantService.CreateLocationAsync(userId, restaurantId, dto, ct);
            return CreatedAtAction(nameof(GetTenant), new { restaurantId }, location);
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Restaurant not found.");
        }
        catch (InvalidOperationException ex)
        {
            if (ex.Message.Contains("admin"))
                return Forbid();
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{restaurantId}/discovery")]
    public async Task<IActionResult> UpdateRestaurantDiscovery(
        string restaurantId,
        [FromBody] UpdateRestaurantDiscoveryDto dto,
        CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId))
            return Unauthorized();

        try
        {
            await _tenantService.UpdateRestaurantDiscoveryAsync(userId, restaurantId, dto, ct);
            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Restaurant not found.");
        }
    }

    [HttpPut("{restaurantId}/locations/{locationId}/discovery")]
    public async Task<IActionResult> UpdateLocationDiscovery(
        string restaurantId,
        string locationId,
        [FromBody] UpdateLocationDiscoveryDto dto,
        CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId))
            return Unauthorized();

        try
        {
            await _tenantService.UpdateLocationDiscoveryAsync(userId, restaurantId, locationId, dto, ct);
            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Location not found.");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{restaurantId}/locations/{locationId}")]
    public async Task<IActionResult> UpdateLocation(string restaurantId, string locationId, [FromBody] UpdateLocationDto dto, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId))
            return Unauthorized();

        try
        {
            await _tenantService.UpdateLocationAsync(userId, restaurantId, locationId, dto, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Location not found.");
        }
        catch (InvalidOperationException ex)
        {
            if (ex.Message.Contains("admin"))
                return Forbid();
            if (ex.Message.Contains("already exists"))
                return Conflict(ex.Message);
            return BadRequest(ex.Message);
        }
    }
}
