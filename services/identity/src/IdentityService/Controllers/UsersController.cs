using System.Security.Claims;
using Duende.IdentityServer;
using IdentityService.Auth;
using IdentityService.Entities;
using IdentityService.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace IdentityService.Controllers;

[ApiController]
[Route("users")] // base: /users
[Authorize( Policy = IdentityServerConstants.LocalApi.PolicyName)]
public class UsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<ApplicationRole> _roleManager;
    private readonly ILogger<UsersController> _logger;
    public UsersController(UserManager<ApplicationUser> userManager, RoleManager<ApplicationRole> roleManager, ILogger<UsersController> logger)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _logger = logger;
    }
    
    
    // =============================
    // SELF‑SERVICE (any authenticated user)
    // =============================
    // GET /users/me
    [HttpGet("me")]
    [Authorize] // Any logged-in user
    public async Task<ActionResult<UserDto>> GetMeAsync()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user is null)
        {
            return Unauthorized();
        }
        var roles = await _userManager.GetRolesAsync(user);
        return Ok(user.ToUserDto(roles));
    }
    
    // =============================
    // ADMIN (role-based)
    // =============================
    // GET /api/users?username=foo&role=Admin
    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<IReadOnlyCollection<UserDetailDto>>> GetUsersAsync(
        [FromQuery] string? username,
        [FromQuery] string? role)
    {
        // If role filter provided, build from role membership first to reduce scan size
        List<ApplicationUser> users;
        if (!string.IsNullOrWhiteSpace(role))
        {
            if (!await _roleManager.RoleExistsAsync(role))
                return BadRequest($"Role '{role}' does not exist.");

            users = (await _userManager.GetUsersInRoleAsync(role)).ToList();
        }
        else
        {
            users = _userManager.Users.ToList();
        }

        if (!string.IsNullOrWhiteSpace(username))
        {
            var term = username.Trim();
            users = users
                .Where(u => u.UserName != null && u.UserName.Contains(term, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        var result = new List<UserDetailDto>(users.Count);
        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            result.Add(u.ToDto(roles));
        }
        return Ok(result);
    }
    
    // GET /users/{id}
    [HttpGet("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<UserDetailDto>> GetByIdAsync([FromRoute] Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return NotFound();

        var roles = await _userManager.GetRolesAsync(user);
        return Ok(user.ToDto(roles));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> PutAsync(Guid id, UserUpdateDto dto)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null)
        {
            return NotFound();
        }
        user.Email = dto.Email;
        user.AccessCode = dto.AccessCode;
        
        if (dto.LockoutEnabled is not null) // null means "don't change"
        {
            user.LockoutEnabled = dto.LockoutEnabled.Value; 
        }
        if (dto.LockoutEnd is not null)
        {
            user.LockoutEnd = dto.LockoutEnd.Value;
        } // null means "don't change"
        return NoContent();
    }

    // DELETE /users/{id} → prefer lock/disable instead of hard delete
    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> DisableAsync([FromRoute] Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return NotFound();

        user.LockoutEnabled = true;
        user.LockoutEnd = DateTimeOffset.MaxValue;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(result.Errors.Select(e => e.Description));

        _logger.LogInformation("User {UserId} locked/disabled by {Admin}", id, 
            User.FindFirstValue(ClaimTypes.NameIdentifier));
        return NoContent();
    }
    
    // =============================
    // ROLE endpoints (admin only)
    // =============================
    // GET /api/roles → list roles
    [HttpGet("roles")] // explicit absolute path
    [Authorize(Roles = Roles.Admin)]
    public ActionResult<IReadOnlyCollection<string>> GetRoles()
    {
        var roles = _roleManager.Roles.Select(r => r.Name!).OrderBy(n => n).ToArray();
        return Ok(roles);
    }
    
    [HttpPost("{id}/roles")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> AddRolesToUser(Guid id, [FromBody] AddRolesDto dto)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return NotFound();

        foreach (var role in dto.Roles)
        {
            if (!await _roleManager.RoleExistsAsync(role))
                return BadRequest($"Role '{role}' does not exist.");
        }

        var result = await _userManager.AddToRolesAsync(user, dto.Roles);
        if (!result.Succeeded)
            return BadRequest(result.Errors);

        return NoContent();
    }
    
    [HttpDelete("{id}/roles/{role}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> RemoveRoleFromUser(Guid id, string role)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return NotFound();

        if (!await _roleManager.RoleExistsAsync(role))
            return BadRequest($"Role '{role}' does not exist.");

        var result = await _userManager.RemoveFromRoleAsync(user, role);
        if (!result.Succeeded)
            return BadRequest(result.Errors);

        return NoContent();
    }
    
    


    
    

}