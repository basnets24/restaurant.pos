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

    public PublicMenuController(IPublicMenuService menu) => _menu = menu;

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

        return Ok(await _menu.GetMenuAsync(restaurantId, locationId, ct));
    }
}
