using CatalogService.Auth;
using CatalogService.Features.Modifiers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CatalogService.Controllers;

/// <summary>
/// Staff authoring for a menu item's modifier groups. Reads sit under /menu-items/{id}/... to
/// keep the "belongs to this item" relationship in the URL; writes to an existing group/option
/// address it by its own id, since PUT/DELETE don't need the parent in the path.
/// </summary>
[ApiController]
[Route("modifier-groups")]
public class ModifierGroupsController : Controller
{
    private readonly IModifierGroupService _service;

    public ModifierGroupsController(IModifierGroupService service)
    {
        _service = service;
    }

    [HttpGet("/menu-items/{menuItemId:guid}/modifier-groups")]
    [Authorize(Policy = CatalogPolicyExtensions.MenuReadPolicy)]
    public async Task<ActionResult<IReadOnlyList<ModifierGroupDto>>> GetForMenuItemAsync(Guid menuItemId)
    {
        var groups = await _service.GetForMenuItemAsync(menuItemId);
        if (groups is null) return NotFound();
        return Ok(groups);
    }

    [HttpPost("/menu-items/{menuItemId:guid}/modifier-groups")]
    [Authorize(Policy = CatalogPolicyExtensions.MenuWritePolicy)]
    public async Task<ActionResult<ModifierGroupDto>> CreateAsync(Guid menuItemId, UpsertModifierGroupDto dto)
    {
        if (ModifierSelectionTypes.Parse(dto.SelectionType) is null)
            return BadRequest(new { error = "Invalid selectionType", allowed = ModifierSelectionTypes.All });

        var group = await _service.CreateAsync(menuItemId, dto);
        if (group is null) return NotFound();
        return CreatedAtAction(nameof(GetForMenuItemAsync), new { menuItemId }, group);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = CatalogPolicyExtensions.MenuWritePolicy)]
    public async Task<ActionResult<ModifierGroupDto>> UpdateAsync(Guid id, UpsertModifierGroupDto dto)
    {
        if (ModifierSelectionTypes.Parse(dto.SelectionType) is null)
            return BadRequest(new { error = "Invalid selectionType", allowed = ModifierSelectionTypes.All });

        var group = await _service.UpdateAsync(id, dto);
        if (group is null) return NotFound();
        return Ok(group);
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = CatalogPolicyExtensions.MenuWritePolicy)]
    public async Task<ActionResult> DeleteAsync(Guid id)
    {
        var deleted = await _service.DeleteAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
