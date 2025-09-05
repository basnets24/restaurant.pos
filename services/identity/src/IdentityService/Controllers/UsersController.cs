// Controllers/UsersController.cs
using System.Security.Claims;
using Common.Library.Tenancy;
using Duende.IdentityServer;
using IdentityService.Auth;
using IdentityService.Entities;
using IdentityService.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Controllers;

[ApiController]
[Route("users")] // base: /users
[Authorize(Policy = IdentityServerConstants.LocalApi.PolicyName)]
public class UsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly RoleManager<ApplicationRole> _roles;
    private readonly ILogger<UsersController> _logger;
    private readonly TenantMiddleware.TenantContextHolder _tenant;

    public UsersController(
        UserManager<ApplicationUser> users,
        RoleManager<ApplicationRole> roles,
        ILogger<UsersController> logger,
        TenantMiddleware.TenantContextHolder tenant)
    {
        _users = users;
        _roles = roles;
        _logger = logger;
        _tenant = tenant;
    }

    // =============================
    // SELF-SERVICE (any authenticated user)
    // =============================

    // GET /users/me
    [HttpGet("me")]
    [Authorize] // Any logged-in user
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<UserDto>> GetMeAsync(CancellationToken ct)
    {
        var t = _tenant.Current;
        var user = await _users.GetUserAsync(User);
        if (user is null || user.RestaurantId != t.RestaurantId)
            return Unauthorized();

        var roles = await _users.GetRolesAsync(user);
        return Ok(user.ToUserDto(roles));
    }

    // =============================
    // ADMIN (role-based)
    // =============================

    // GET /users?username=&role=&page=&pageSize=
    [HttpGet]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(typeof(Paged<UserListItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<Paged<UserListItemDto>>> ListAsync(
        [FromQuery] UsersQuery query,
        CancellationToken ct)
    {
        var t = _tenant.Current;

        var page = query.Page < 1 ? 1 : query.Page;
        var size = query.PageSize is < 1 or > 200 ? 25 : query.PageSize;

        // Role filter path: start from membership to shrink candidate set
        if (!string.IsNullOrWhiteSpace(query.Role))
        {
            if (!await _roles.RoleExistsAsync(query.Role))
                return BadRequest($"Role '{query.Role}' does not exist.");

            var usersInRole = (await _users.GetUsersInRoleAsync(query.Role)).AsQueryable();

            usersInRole = usersInRole.Where(u => u.RestaurantId == t.RestaurantId);

            if (!string.IsNullOrWhiteSpace(query.Username))
            {
                var term = query.Username.Trim();
                usersInRole = usersInRole.Where(u =>
                    EF.Functions.Like(u.UserName ?? "", $"%{term}%") ||
                    EF.Functions.Like(u.Email ?? "", $"%{term}%") ||
                    EF.Functions.Like(u.DisplayName ?? "", $"%{term}%"));
            }

            var total = usersInRole.Count();

            var pageUsers = usersInRole
                .OrderBy(u => u.UserName)
                .Skip((page - 1) * size)
                .Take(size)
                .ToList();

            var items = new List<UserListItemDto>(pageUsers.Count);
            foreach (var u in pageUsers)
            {
                var roles = await _users.GetRolesAsync(u);
                items.Add(ToListItem(u, roles));
            }

            return Ok(new Paged<UserListItemDto>(items, page, size, total));
        }

        // No role filter: keep IQueryable to push work to DB
        var q = _users.Users.AsNoTracking()
            .Where(u => u.RestaurantId == t.RestaurantId);

        if (!string.IsNullOrWhiteSpace(query.Username))
        {
            var term = query.Username.Trim();
            q = q.Where(u =>
                EF.Functions.Like(u.UserName ?? "", $"%{term}%") ||
                EF.Functions.Like(u.Email ?? "", $"%{term}%") ||
                EF.Functions.Like(u.DisplayName ?? "", $"%{term}%"));
        }

        var totalDb = await q.LongCountAsync(ct);

        var pageUsersDb = await q
            .OrderBy(u => u.UserName)
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync(ct);

        var itemsDb = new List<UserListItemDto>(pageUsersDb.Count);
        foreach (var u in pageUsersDb)
        {
            var roles = await _users.GetRolesAsync(u);
            itemsDb.Add(ToListItem(u, roles));
        }

        return Ok(new Paged<UserListItemDto>(itemsDb, page, size, totalDb));
    }

    // GET /users/{userId}
    [HttpGet("{userId:guid}")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(typeof(UserDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserDetailDto>> GetByIdAsync([FromRoute] Guid userId, CancellationToken ct)
    {
        var t = _tenant.Current;

        var user = await _users.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, ct);
        if (user is null || user.RestaurantId != t.RestaurantId)
            return NotFound();

        var roles = await _users.GetRolesAsync(user);
        return Ok(user.ToDto(roles));
    }

    // PUT /users/{userId}
    [HttpPut("{userId:guid}")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateAsync([FromRoute] Guid userId, [FromBody] UserUpdateDto dto, CancellationToken ct)
    {
        var t = _tenant.Current;
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null || user.RestaurantId != t.RestaurantId)
            return NotFound();

        // Prevent cross-restaurant moves
        if (!string.Equals(dto.RestaurantId, user.RestaurantId, StringComparison.Ordinal))
            return BadRequest("RestaurantId mismatch.");

        // Basic fields
        if (!string.IsNullOrWhiteSpace(dto.UserName))
        {
            user.UserName = dto.UserName.Trim();
            user.NormalizedUserName = user.UserName.ToUpperInvariant();
        }

        if (!string.IsNullOrWhiteSpace(dto.Email))
        {
            user.Email = dto.Email.Trim();
            user.NormalizedEmail = user.Email.ToUpperInvariant();
        }

        if (!string.IsNullOrWhiteSpace(dto.DisplayName))
            user.DisplayName = dto.DisplayName.Trim();

        // Location within same restaurant
        if (!string.IsNullOrWhiteSpace(dto.LocationId))
            user.LocationId = dto.LocationId.Trim();

        // Access/PIN, lockout, 2FA
        if (dto.AccessCode is not null)            user.AccessCode = dto.AccessCode;
        if (dto.LockoutEnabled.HasValue)           user.LockoutEnabled = dto.LockoutEnabled.Value;
        if (dto.LockoutEnd.HasValue)               user.LockoutEnd = dto.LockoutEnd.Value;
        if (dto.TwoFactorEnabled.HasValue)         user.TwoFactorEnabled = dto.TwoFactorEnabled.Value;

        var result = await _users.UpdateAsync(user);
        if (!result.Succeeded) return BadRequest(result.Errors.Select(e => e.Description));

        return NoContent();
    }

    // DELETE /users/{userId}  (soft-disable/lock)
    [HttpDelete("{userId:guid}")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DisableAsync([FromRoute] Guid userId, CancellationToken ct)
    {
        var t = _tenant.Current;
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null || user.RestaurantId != t.RestaurantId)
            return NotFound();

        var roles = await _users.GetRolesAsync(user);
        if (roles.Contains(Roles.Admin))
            return BadRequest("Cannot disable an Admin.");

        user.LockoutEnabled = true;
        user.LockoutEnd = DateTimeOffset.MaxValue;

        var result = await _users.UpdateAsync(user);
        if (!result.Succeeded) return BadRequest(result.Errors.Select(e => e.Description));

        _logger.LogInformation("User {UserId} locked/disabled by {Admin}", userId,
            User.FindFirstValue(ClaimTypes.NameIdentifier));
        return NoContent();
    }

    // =============================
    // ROLE endpoints (admin only)
    // =============================

    // GET /users/{userId}/roles
    [HttpGet("{userId:guid}/roles")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyCollection<string>>> GetUserRolesAsync([FromRoute] Guid userId, CancellationToken ct)
    {
        var t = _tenant.Current;
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null || user.RestaurantId != t.RestaurantId)
            return NotFound();

        var roles = await _users.GetRolesAsync(user);
        return Ok(roles);
    }

    // POST /users/{userId}/roles   body: { "roles": ["Manager","Chef"] }
    [HttpPost("{userId:guid}/roles")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddRolesAsync([FromRoute] Guid userId, [FromBody] AddRolesDto dto, CancellationToken ct)
    {
        var t = _tenant.Current;
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null || user.RestaurantId != t.RestaurantId)
            return NotFound();

        var distinct = dto.Roles
            .Select(r => r.Trim())
            .Where(r => r.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (distinct.Length == 0) return BadRequest("No roles provided.");

        foreach (var role in distinct)
            if (!await _roles.RoleExistsAsync(role))
                return BadRequest($"Role '{role}' does not exist.");

        var result = await _users.AddToRolesAsync(user, distinct);
        if (!result.Succeeded) return BadRequest(result.Errors.Select(e => e.Description));

        return NoContent();
    }

    // DELETE /users/{userId}/roles/{role}
    [HttpDelete("{userId:guid}/roles/{role}")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> RemoveRoleAsync([FromRoute] Guid userId, [FromRoute] string role, CancellationToken ct)
    {
        var t = _tenant.Current;
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null || user.RestaurantId != t.RestaurantId)
            return NotFound();

        if (!await _roles.RoleExistsAsync(role))
            return BadRequest($"Role '{role}' does not exist.");

        var result = await _users.RemoveFromRoleAsync(user, role);
        if (!result.Succeeded) return BadRequest(result.Errors.Select(e => e.Description));

        return NoContent();
    }

    // GET /users/roles (for filter dropdowns)
    [HttpGet("roles")]
    [Authorize(Roles = Roles.Admin)]
    [ProducesResponseType(typeof(IEnumerable<string>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<string>> GetAllRoles()
        => Ok(_roles.Roles.Select(r => r.Name!).OrderBy(n => n).ToList());

    // ---- mapping for list item (detail mapping uses your existing extension) ----
    private static UserListItemDto ToListItem(ApplicationUser u, IEnumerable<string> roles) =>
        new(
            u.Id,
            u.Email,
            u.UserName,
            u.DisplayName,
            u.EmailConfirmed,
            u.LockoutEnd.HasValue && u.LockoutEnd > DateTimeOffset.UtcNow,
            roles
        );
}
