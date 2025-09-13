using Duende.IdentityServer;
using Tenant.Domain.Data;
using IdentityService.Entities;
using Tenant.Domain.Entities;
using IdentityService.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Controllers;

[ApiController]
[Route("tenants/{restaurantId}/employees")] // /tenants/{rid}/employees
[Authorize(Policy = IdentityServerConstants.LocalApi.PolicyName)]
public class EmployeesController : ControllerBase
{
    private readonly TenantDbContext _tenantDb;
    private readonly UserManager<ApplicationUser> _users;
    private readonly ILogger<EmployeesController> _logger;

    public EmployeesController(TenantDbContext tenantDb, 
        UserManager<ApplicationUser> users, 
        ILogger<EmployeesController> logger)
    {
        _tenantDb = tenantDb;
        _users = users;
        _logger = logger;
    }

    // GET /tenants/{rid}/employees?q=&role=&page=&pageSize=
    [HttpGet]
    public async Task<ActionResult<Paged<EmployeeListItemDto>>> List(
        string restaurantId,
        [FromQuery] string? q,
        [FromQuery] string? role,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        if (!Guid.TryParse(User.FindFirst("sub")?.Value, out var callerId)) return Unauthorized();
        if (!await IsTenantAdminAsync(callerId, restaurantId, ct)) return Forbid();
        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 25 : pageSize;

        var memberQuery = _tenantDb.RestaurantMemberships
            .AsNoTracking()
            .Where(m => m.RestaurantId == restaurantId)
            .Select(m => new { m.UserId, m.DefaultLocationId });

        // Filter by role if provided
        if (!string.IsNullOrWhiteSpace(role))
        {
            var roleTrim = role.Trim();
            var usersWithRole = _tenantDb.RestaurantUserRoles
                .AsNoTracking()
                .Where(r => r.RestaurantId == restaurantId && r.RoleName == roleTrim)
                .Select(r => r.UserId)
                .Distinct();
            memberQuery = memberQuery.Where(m => usersWithRole.Contains(m.UserId));
        }

        var memberList = await memberQuery.ToListAsync(ct);
        if (memberList.Count == 0) return Ok(new Paged<EmployeeListItemDto>(Array.Empty<EmployeeListItemDto>(), page, pageSize, 0));

        var userIds = memberList.Select(m => m.UserId).Distinct().ToArray();

        var usersQuery = _users.Users.AsNoTracking().Where(u => userIds.Contains(u.Id));
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            usersQuery = usersQuery.Where(u =>
                EF.Functions.Like(u.UserName ?? "", $"%{term}%") ||
                EF.Functions.Like(u.Email ?? "", $"%{term}%") ||
                EF.Functions.Like(u.DisplayName ?? "", $"%{term}%"));
        }

        var totalMatched = await usersQuery.LongCountAsync(ct);
        var pageUsers = await usersQuery
            .OrderBy(u => u.UserName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new { u.Id, u.Email, u.UserName, u.DisplayName })
            .ToListAsync(ct);

        var pageUserIds = pageUsers.Select(u => u.Id).ToArray();

        var roles = await _tenantDb.RestaurantUserRoles
            .AsNoTracking()
            .Where(r => r.RestaurantId == restaurantId && pageUserIds.Contains(r.UserId))
            .GroupBy(r => r.UserId)
            .Select(g => new { UserId = g.Key, Roles = g.Select(x => x.RoleName).Distinct().ToList() })
            .ToListAsync(ct);

        var rolesMap = roles.ToDictionary(x => x.UserId, x => (IReadOnlyCollection<string>)x.Roles);
        var defaultLocMap = memberList.GroupBy(m => m.UserId).ToDictionary(g => g.Key, g => g.Select(x => x.DefaultLocationId).FirstOrDefault());

        var items = pageUsers.Select(u => new EmployeeListItemDto(
            u.Id, u.Email, u.UserName, u.DisplayName,
            defaultLocMap.TryGetValue(u.Id, out var dloc) ? dloc : null,
            rolesMap.TryGetValue(u.Id, out var rs) ? rs : Array.Empty<string>()))
            .ToList();

        return Ok(new Paged<EmployeeListItemDto>(items, page, pageSize, totalMatched));
    }

    // GET /tenants/{rid}/employees/{userId}
    [HttpGet("{userId:guid}")]
    public async Task<ActionResult<EmployeeDetailDto>> GetById(string restaurantId, 
        Guid userId, CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirst("sub")?.Value, out var callerId)) return Unauthorized();
        if (!await IsTenantAdminAsync(callerId, restaurantId, ct)) return Forbid();

        var membership = await _tenantDb.RestaurantMemberships.AsNoTracking()
            .FirstOrDefaultAsync(m => m.RestaurantId == restaurantId && m.UserId == userId, ct);
        if (membership is null) return NotFound();

        var user = await _users.Users.AsNoTracking()
            .Select(u => new { u.Id, u.Email, u.UserName, u.DisplayName, u.EmailConfirmed, u.LockoutEnd })
            .FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return NotFound();

        var roles = await _tenantDb.RestaurantUserRoles.AsNoTracking()
            .Where(r => r.RestaurantId == restaurantId && r.UserId == userId)
            .Select(r => r.RoleName)
            .Distinct()
            .ToListAsync(ct);

        var lockedOut = user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow;
        var dto = new EmployeeDetailDto(user.Id, user.Email, user.UserName, user.DisplayName, user.EmailConfirmed, lockedOut, membership.DefaultLocationId, roles);
        return Ok(dto);
    }

    // PUT /tenants/{rid}/employees/{userId}
    [HttpPut("{userId:guid}")]
    public async Task<IActionResult> Update(string restaurantId, Guid userId, 
        [FromBody] UserUpdateDto dto, CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirst("sub")?.Value, out var callerId)) return Unauthorized();
        if (!await IsTenantAdminAsync(callerId, restaurantId, ct)) return Forbid();

        var membership = await _tenantDb.RestaurantMemberships.AsNoTracking()
            .AnyAsync(m => m.RestaurantId == restaurantId && m.UserId == userId, ct);
        if (!membership) return NotFound();

        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null) return NotFound();

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
        {
            user.DisplayName = dto.DisplayName.Trim();
        }
        if (dto.AccessCode is not null)            user.AccessCode = dto.AccessCode;
        if (dto.LockoutEnabled.HasValue)           user.LockoutEnabled = dto.LockoutEnabled.Value;
        if (dto.LockoutEnd.HasValue)               user.LockoutEnd = dto.LockoutEnd.Value;
        if (dto.TwoFactorEnabled.HasValue)         user.TwoFactorEnabled = dto.TwoFactorEnabled.Value;

        var result = await _users.UpdateAsync(user);
        if (!result.Succeeded) return BadRequest(result.Errors.Select(e => e.Description));
        return NoContent();
    }

    // GET /tenants/{rid}/employees/{userId}/roles
    [HttpGet("{userId:guid}/roles")]
    public async Task<ActionResult<IReadOnlyCollection<string>>> GetTenantRoles(string restaurantId, Guid userId, CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirst("sub")?.Value, out var callerId)) return Unauthorized();
        if (!await IsTenantAdminAsync(callerId, restaurantId, ct)) return Forbid();

        var roles = await _tenantDb.RestaurantUserRoles.AsNoTracking()
            .Where(r => r.RestaurantId == restaurantId && r.UserId == userId)
            .Select(r => r.RoleName)
            .Distinct()
            .ToListAsync(ct);
        return Ok(roles);
    }

    // POST /tenants/{rid}/employees/{userId}/roles
    [HttpPost("{userId:guid}/roles")]
    public async Task<IActionResult> AddTenantRoles(string restaurantId, Guid userId, [FromBody] EmployeeRoleUpdateDto dto, CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirst("sub")?.Value, out var callerId)) return Unauthorized();
        if (!await IsTenantAdminAsync(callerId, restaurantId, ct)) return Forbid();

        var membership = await _tenantDb.RestaurantMemberships.FirstOrDefaultAsync(m => m.UserId == userId && m.RestaurantId == restaurantId, ct);
        if (membership is null) return NotFound("User is not a member of this restaurant.");

        var incoming = (dto.Roles ?? Array.Empty<string>())
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Select(r => r.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        if (incoming.Length == 0) return BadRequest("No roles provided.");

        var existing = await _tenantDb.RestaurantUserRoles
            .Where(r => r.RestaurantId == restaurantId && r.UserId == userId)
            .Select(r => r.RoleName)
            .ToListAsync(ct);

        var toAdd = incoming.Except(existing, StringComparer.OrdinalIgnoreCase).ToArray();
        if (toAdd.Length == 0) return NoContent();

        foreach (var role in toAdd)
        {
            _tenantDb.RestaurantUserRoles.Add(new RestaurantUserRole
            {
                UserId = userId,
                RestaurantId = restaurantId,
                RoleName = role
            });
        }

        await _tenantDb.SaveChangesAsync(ct);
        _logger.LogInformation("Added tenant roles {Roles} for user {UserId} in restaurant {RestaurantId} by {Caller}", string.Join(",", toAdd), userId, restaurantId, callerId);
        return NoContent();
    }

    // DELETE /tenants/{rid}/employees/{userId}/roles/{role}
    [HttpDelete("{userId:guid}/roles/{role}")]
    public async Task<IActionResult> RemoveTenantRole(string restaurantId, Guid userId, string role, CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirst("sub")?.Value, out var callerId)) return Unauthorized();
        if (!await IsTenantAdminAsync(callerId, restaurantId, ct)) return Forbid();

        var row = await _tenantDb.RestaurantUserRoles
            .FirstOrDefaultAsync(r => r.RestaurantId == restaurantId && r.UserId == userId && r.RoleName == role, ct);
        if (row is null) return NotFound();

        _tenantDb.RestaurantUserRoles.Remove(row);
        await _tenantDb.SaveChangesAsync(ct);
        _logger.LogInformation("Removed tenant role {Role} for user {UserId} in restaurant {RestaurantId} by {Caller}", role, userId, restaurantId, callerId);
        return NoContent();
    }

    // POST /tenants/{rid}/employees
    [HttpPost]
    public async Task<IActionResult> AddEmployee(string restaurantId, [FromBody] AddEmployeeDto dto, CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirst("sub")?.Value, out var callerId)) return Unauthorized();
        if (!await IsTenantAdminAsync(callerId, restaurantId, ct)) return Forbid();

        // validate user exists
        var user = await _users.FindByIdAsync(dto.UserId.ToString());
        if (user is null) return NotFound("User not found.");

        // ensure location belongs to restaurant when provided
        if (!string.IsNullOrEmpty(dto.DefaultLocationId))
        {
            var locOk = await _tenantDb.Locations.AsNoTracking()
                .AnyAsync(l => l.Id == dto.DefaultLocationId && l.RestaurantId == restaurantId, ct);
            if (!locOk) return BadRequest("DefaultLocationId is invalid for this restaurant.");
        }

        var existing = await _tenantDb.RestaurantMemberships
            .FirstOrDefaultAsync(m => m.UserId == dto.UserId && m.RestaurantId == restaurantId, ct);
        if (existing is null)
        {
            _tenantDb.RestaurantMemberships.Add(new RestaurantMembership
            {
                UserId = dto.UserId,
                RestaurantId = restaurantId,
                DefaultLocationId = dto.DefaultLocationId
            });
        }
        else if (!string.IsNullOrEmpty(dto.DefaultLocationId))
        {
            existing.DefaultLocationId = dto.DefaultLocationId;
        }

        // Add roles if provided
        if (dto.Roles is not null && dto.Roles.Count > 0)
        {
            var incoming = dto.Roles.Where(r => !string.IsNullOrWhiteSpace(r)).Select(r => r.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
            var existingRoles = await _tenantDb.RestaurantUserRoles
                .Where(r => r.RestaurantId == restaurantId && r.UserId == dto.UserId)
                .Select(r => r.RoleName)
                .ToListAsync(ct);
            var toAdd = incoming.Except(existingRoles, StringComparer.OrdinalIgnoreCase).ToArray();
            foreach (var roleName in toAdd)
            {
                _tenantDb.RestaurantUserRoles.Add(new RestaurantUserRole
                {
                    UserId = dto.UserId,
                    RestaurantId = restaurantId,
                    RoleName = roleName
                });
            }
        }

        await _tenantDb.SaveChangesAsync(ct);
        return NoContent();
    }

    // PUT /tenants/{rid}/employees/{userId}/default-location
    [HttpPut("{userId:guid}/default-location")]
    public async Task<IActionResult> UpdateDefaultLocation(string restaurantId, Guid userId, [FromBody] DefaultLocationUpdateDto dto, CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirst("sub")?.Value, out var callerId)) return Unauthorized();
        if (!await IsTenantAdminAsync(callerId, restaurantId, ct)) return Forbid();

        var membership = await _tenantDb.RestaurantMemberships
            .FirstOrDefaultAsync(m => m.RestaurantId == restaurantId && m.UserId == userId, ct);
        if (membership is null) return NotFound();

        var locOk = await _tenantDb.Locations.AsNoTracking()
            .AnyAsync(l => l.Id == dto.DefaultLocationId && l.RestaurantId == restaurantId, ct);
        if (!locOk) return BadRequest("DefaultLocationId is invalid for this restaurant.");

        membership.DefaultLocationId = dto.DefaultLocationId;
        await _tenantDb.SaveChangesAsync(ct);
        return NoContent();
    }

    // GET /tenants/{rid}/employees/roles (available role names)
    [HttpGet("roles")]
    public ActionResult<IReadOnlyCollection<string>> GetAvailableRoles()
    {
        return Ok(new []
        {
            TenantRoles.TenantOwner,
            TenantRoles.TenantAdmin,
            TenantRoles.TenantManager,
            TenantRoles.TenantServer,
            TenantRoles.TenantChef,
            TenantRoles.TenantCashier,
            TenantRoles.TenantHost
            
        });
    }

    private async Task<bool> IsTenantAdminAsync(Guid userId, string restaurantId, CancellationToken ct)
    {
        return await _tenantDb.RestaurantUserRoles
            .AsNoTracking()
            .AnyAsync(r => r.UserId == userId && r.RestaurantId == restaurantId && r.RoleName == "Admin", ct);
    }
}
