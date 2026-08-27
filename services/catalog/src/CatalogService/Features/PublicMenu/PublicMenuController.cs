using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CatalogService.Features.PublicMenu;

/// <summary>
/// Catalog's only anonymous surface. Everything here is public and unauthenticated - add
/// nothing that isn't safe to hand to the open internet, and see <see cref="PublicMenuService"/>
/// for why the tenant must arrive as an explicit argument rather than a header.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("public")]
public class PublicMenuController : ControllerBase
{
    private readonly IPublicMenuService _menu;
    private readonly ILocationDirectoryClient _directory;

    public PublicMenuController(IPublicMenuService menu, ILocationDirectoryClient directory)
    {
        _menu = menu;
        _directory = directory;
    }

    // GET public/menu?restaurantId=&locationId=
    [HttpGet("menu")]
    public async Task<ActionResult<PublicMenuDto>> GetMenu(
        [FromQuery] string? restaurantId,
        [FromQuery] string? locationId,
        CancellationToken ct)
    {
        // Explicitly rejected rather than defaulted. TenantMiddleware would happily fall back
        // to the hardcoded default tenant, which for an anonymous caller means quietly serving
        // the wrong restaurant's menu.
        if (string.IsNullOrWhiteSpace(restaurantId) || string.IsNullOrWhiteSpace(locationId))
            return BadRequest(new { message = "restaurantId and locationId are required." });

        // The gate lives here rather than in PublicMenuService because it is a question about
        // the tenant, not about the menu, and the answer comes from another service. Any future
        // anonymous endpoint in this controller needs its own call - there is no filter behind
        // this one.
        bool discoverable;
        try
        {
            discoverable = await _directory.IsDiscoverableAsync(restaurantId, locationId, ct);
        }
        catch (DirectoryUnavailableException ex)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = ex.Message });
        }

        // Same 404 identity gives for an unlisted location, and for the same reason: a public
        // endpoint should not confirm that a private tenant exists. Note this is about the
        // restaurant being listed at all - a listed location with nothing sellable still
        // returns 200 and an empty menu.
        if (!discoverable) return NotFound();

        return Ok(await _menu.GetMenuAsync(restaurantId, locationId, ct));
    }
}
