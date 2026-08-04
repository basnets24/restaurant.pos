using IdentityService.Features.Discovery.DTOs;
using IdentityService.Features.Discovery.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IdentityService.Features.Discovery.Controllers;

/// <summary>
/// The platform's only anonymous API surface. Everything here is public, unauthenticated and
/// cross-tenant by design - keep it in this one controller so that stays obvious, and add
/// nothing here that isn't safe to hand to the open internet.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("public")]
public class PublicDiscoveryController : ControllerBase
{
    private readonly IDiscoveryService _discovery;

    public PublicDiscoveryController(IDiscoveryService discovery) => _discovery = discovery;

    // GET public/restaurants?q=&cuisine=&sort=
    [HttpGet("restaurants")]
    public async Task<ActionResult<IReadOnlyList<DiscoveryListingDto>>> Search(
        [FromQuery] string? q,
        [FromQuery] string? cuisine,
        [FromQuery] DiscoverySort sort = DiscoverySort.Recommended,
        CancellationToken ct = default)
    {
        var listings = await _discovery.SearchAsync(
            new DiscoveryQuery { Q = q, Cuisine = cuisine, Sort = sort }, ct);

        return Ok(listings);
    }

    // GET public/restaurants/{restaurantId}/locations/{locationId}
    [HttpGet("restaurants/{restaurantId}/locations/{locationId}")]
    public async Task<ActionResult<DiscoveryListingDto>> Get(
        string restaurantId,
        string locationId,
        CancellationToken ct = default)
    {
        var listing = await _discovery.GetAsync(restaurantId, locationId, ct);

        // Deliberately the same 404 whether the listing does not exist or is simply not
        // discoverable - a public endpoint should not confirm that a private tenant exists.
        return listing is null ? NotFound() : Ok(listing);
    }

    // GET public/cuisines
    [HttpGet("cuisines")]
    public async Task<ActionResult<IReadOnlyList<string>>> Cuisines(CancellationToken ct = default)
        => Ok(await _discovery.GetCuisinesAsync(ct));
}
