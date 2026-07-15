using System.Security.Claims;
using Duende.IdentityServer;
using IdentityService.Features.Identity.DTOs;
using IdentityService.Features.Identity.Services;
using IdentityService.Features.Shared.Constants;
using IdentityService.Features.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IdentityService.Features.Identity.Controllers;

[ApiController]
[Route("users")]
[Authorize(Policy = IdentityServerConstants.LocalApi.PolicyName)]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(IUserService userService, ILogger<UsersController> logger)
    {
        _userService = userService ?? throw new ArgumentNullException(nameof(userService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserDto>> GetMeAsync(CancellationToken ct)
    {
        var user = await _userService.GetMeAsync(User, ct);
        return user is null ? Unauthorized() : Ok(user);
    }

    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(typeof(Paged<UserListItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<Paged<UserListItemDto>>> ListAsync(
        [FromQuery] UsersQuery query,
        CancellationToken ct)
    {
        var result = await _userService.ListUsersAsync(query, ct);
        return Ok(result);
    }

    [HttpGet("{userId:guid}")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(typeof(UserDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserDetailDto>> GetByIdAsync([FromRoute] Guid userId, CancellationToken ct)
    {
        var user = await _userService.GetByIdAsync(userId, ct);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpPut("{userId:guid}")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateAsync(
        [FromRoute] Guid userId,
        [FromBody] UserUpdateDto dto,
        CancellationToken ct)
    {
        try
        {
            await _userService.UpdateAsync(userId, dto, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{userId:guid}")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DisableAsync([FromRoute] Guid userId, CancellationToken ct)
    {
        try
        {
            await _userService.DisableAsync(userId, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{userId:guid}/roles")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyCollection<string>>> GetUserRolesAsync(
        [FromRoute] Guid userId,
        CancellationToken ct)
    {
        try
        {
            var roles = await _userService.GetUserRolesAsync(userId, ct);
            return Ok(roles);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("{userId:guid}/roles")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddRolesAsync(
        [FromRoute] Guid userId,
        [FromBody] AddRolesDto dto,
        CancellationToken ct)
    {
        try
        {
            await _userService.AddRolesAsync(userId, dto, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpDelete("{userId:guid}/roles/{role}")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RemoveRoleAsync(
        [FromRoute] Guid userId,
        [FromRoute] string role,
        CancellationToken ct)
    {
        try
        {
            await _userService.RemoveRoleAsync(userId, role, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("roles")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<string>>> GetAllRolesAsync(CancellationToken ct)
    {
        var roles = await _userService.GetAllRolesAsync(ct);
        return Ok(roles.OrderBy(r => r).ToList());
    }
}
