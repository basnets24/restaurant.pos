using IdentityService.Common.Extensions;
using IdentityService.Features.Identity.DTOs;
using IdentityService.Entities;
using IdentityService.Features.Identity.Repositories;
using IdentityService.Features.Shared.DTOs;
using IdentityService.Features.Tenancy.DTOs;
using IdentityService.Features.Tenancy.Repositories;
using IdentityService.HostedServices;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Tenant.Domain;
using Tenant.Domain.Data;
using Tenant.Domain.Entities;

namespace IdentityService.Features.Tenancy.Services;

public class EmployeeService : IEmployeeService
{
    private readonly IUserRepository _userRepository;
    private readonly ILocationRepository _locationRepository;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly TenantDbContext _tenantDb;
    private readonly ILogger<EmployeeService> _logger;

    public EmployeeService(
        IUserRepository userRepository,
        ILocationRepository locationRepository,
        UserManager<ApplicationUser> userManager,
        TenantDbContext tenantDb,
        ILogger<EmployeeService> logger)
    {
        _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
        _locationRepository = locationRepository ?? throw new ArgumentNullException(nameof(locationRepository));
        _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
        _tenantDb = tenantDb ?? throw new ArgumentNullException(nameof(tenantDb));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Paged<EmployeeListItemDto>> ListEmployeesAsync(
        Guid userId,
        string restaurantId,
        string? searchQuery,
        string? role,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(restaurantId);

        if (!await _tenantDb.IsTenantAdminAsync(userId, restaurantId, ct))
        {
            throw new UnauthorizedAccessException($"User {userId} is not an admin of restaurant {restaurantId}");
        }

        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 25 : pageSize;

        var memberQuery = _tenantDb.RestaurantMemberships
            .AsNoTracking()
            .Where(m => m.RestaurantId == restaurantId)
            .Select(m => new { m.UserId, m.DefaultLocationId });

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
        if (memberList.Count == 0)
        {
            return new Paged<EmployeeListItemDto>(new List<EmployeeListItemDto>(), page, pageSize, 0);
        }

        var userIds = memberList.Select(m => m.UserId).Distinct().ToArray();
        var usersQuery = _userRepository.AsQueryable().AsNoTracking().Where(u => userIds.Contains(u.Id));

        if (!string.IsNullOrWhiteSpace(searchQuery))
        {
            var term = searchQuery.Trim();
            usersQuery = usersQuery.Where(u =>
                EF.Functions.Like(u.UserName ?? "", $"%{term}%") ||
                EF.Functions.Like(u.Email ?? "", $"%{term}%") ||
                EF.Functions.Like(u.DisplayName ?? "", $"%{term}%"));
        }

        var total = await usersQuery.LongCountAsync(ct);
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
        var defaultLocMap = memberList.GroupBy(m => m.UserId)
            .ToDictionary(g => g.Key, g => g.Select(x => x.DefaultLocationId).FirstOrDefault());

        var items = pageUsers.Select(u => new EmployeeListItemDto(
            u.Id,
            u.Email,
            u.UserName,
            u.DisplayName,
            defaultLocMap.TryGetValue(u.Id, out var dloc) ? dloc : null,
            rolesMap.TryGetValue(u.Id, out var rs) ? rs : Array.Empty<string>()))
            .ToList();

        return new Paged<EmployeeListItemDto>(items, page, pageSize, total);
    }

    public async Task<EmployeeDetailDto?> GetEmployeeAsync(
        Guid userId,
        string restaurantId,
        Guid employeeId,
        CancellationToken ct = default)
    {
        if (!await _tenantDb.IsTenantAdminAsync(userId, restaurantId, ct))
        {
            throw new UnauthorizedAccessException($"User {userId} is not an admin of restaurant {restaurantId}");
        }

        var membership = await _tenantDb.RestaurantMemberships.AsNoTracking()
            .FirstOrDefaultAsync(m => m.RestaurantId == restaurantId && m.UserId == employeeId, ct);
        if (membership is null)
        {
            return null;
        }

        var user = await _userRepository.GetByIdAsync(employeeId);
        if (user is null)
        {
            return null;
        }

        var roles = await _tenantDb.RestaurantUserRoles.AsNoTracking()
            .Where(r => r.RestaurantId == restaurantId && r.UserId == employeeId)
            .Select(r => r.RoleName)
            .Distinct()
            .ToListAsync(ct);

        var lockedOut = user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow;

        return new EmployeeDetailDto(
            user.Id,
            user.Email,
            user.UserName,
            user.DisplayName,
            user.EmailConfirmed,
            lockedOut,
            membership.DefaultLocationId,
            roles);
    }

    public async Task UpdateEmployeeAsync(
        Guid userId,
        string restaurantId,
        Guid employeeId,
        UserUpdateDto dto,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(dto);

        if (!await _tenantDb.IsTenantAdminAsync(userId, restaurantId, ct))
        {
            throw new UnauthorizedAccessException($"User {userId} is not an admin of restaurant {restaurantId}");
        }

        var membership = await _tenantDb.RestaurantMemberships.AsNoTracking()
            .AnyAsync(m => m.RestaurantId == restaurantId && m.UserId == employeeId, ct);
        if (!membership)
        {
            throw new KeyNotFoundException($"Employee {employeeId} not found in restaurant {restaurantId}");
        }

        var user = await _userRepository.GetByIdAsync(employeeId);
        if (user is null)
        {
            throw new KeyNotFoundException($"User {employeeId} not found");
        }

        // The demo admin is one shared, persistent seeded account reused by every "Explore
        // staff demo" visitor - DemoAdminGrantValidator looks it up by this exact hardcoded
        // email, so letting anyone holding a demo_admin token repoint that email or username
        // would break the demo login for every visitor after them, not just their own
        // session. The frontend already hides the edit UI for a demo session, but that's not
        // enforcement - block it here too regardless of caller or client. DisplayName/
        // AccessCode/etc. below are unaffected and still work for the demo account.
        var isSeededDemoAdmin = string.Equals(user.Email, DemoSeedHostedService.AdminEmail, StringComparison.OrdinalIgnoreCase);
        if (isSeededDemoAdmin && (!string.IsNullOrWhiteSpace(dto.UserName) || !string.IsNullOrWhiteSpace(dto.Email)))
        {
            throw new InvalidOperationException("Cannot change the seeded demo admin's email or username");
        }

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

        if (dto.AccessCode is not null)
            user.AccessCode = dto.AccessCode;
        if (dto.LockoutEnabled.HasValue)
            user.LockoutEnabled = dto.LockoutEnabled.Value;
        if (dto.LockoutEnd.HasValue)
            user.LockoutEnd = dto.LockoutEnd.Value;
        if (dto.TwoFactorEnabled.HasValue)
            user.TwoFactorEnabled = dto.TwoFactorEnabled.Value;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Failed to update employee: {errors}");
        }

        _logger.LogInformation("Employee {EmployeeId} updated in restaurant {RestaurantId} by user {UserId}",
            employeeId, restaurantId, userId);
    }

    public async Task<IReadOnlyCollection<string>> GetEmployeeRolesAsync(
        Guid userId,
        string restaurantId,
        Guid employeeId,
        CancellationToken ct = default)
    {
        if (!await _tenantDb.IsTenantAdminAsync(userId, restaurantId, ct))
        {
            throw new UnauthorizedAccessException($"User {userId} is not an admin of restaurant {restaurantId}");
        }

        return await _tenantDb.RestaurantUserRoles.AsNoTracking()
            .Where(r => r.RestaurantId == restaurantId && r.UserId == employeeId)
            .Select(r => r.RoleName)
            .Distinct()
            .ToListAsync(ct);
    }

    public async Task AddEmployeeRolesAsync(
        Guid userId,
        string restaurantId,
        Guid employeeId,
        EmployeeRoleUpdateDto dto,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(dto);

        if (!await _tenantDb.IsTenantAdminAsync(userId, restaurantId, ct))
        {
            throw new UnauthorizedAccessException($"User {userId} is not an admin of restaurant {restaurantId}");
        }

        var membership = await _tenantDb.RestaurantMemberships.FirstOrDefaultAsync(
            m => m.UserId == employeeId && m.RestaurantId == restaurantId, ct);
        if (membership is null)
        {
            throw new KeyNotFoundException($"Employee {employeeId} is not a member of restaurant {restaurantId}");
        }

        var incoming = (dto.Roles ?? Array.Empty<string>())
            .Where(r => !string.IsNullOrWhiteSpace(r))
            .Select(r => r.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (incoming.Length == 0)
        {
            throw new ArgumentException("No roles provided");
        }

        var existing = await _tenantDb.RestaurantUserRoles
            .Where(r => r.RestaurantId == restaurantId && r.UserId == employeeId)
            .Select(r => r.RoleName)
            .ToListAsync(ct);

        var toAdd = incoming.Except(existing, StringComparer.OrdinalIgnoreCase).ToArray();
        if (toAdd.Length > 0)
        {
            foreach (var role in toAdd)
            {
                _tenantDb.RestaurantUserRoles.Add(new RestaurantUserRole
                {
                    UserId = employeeId,
                    RestaurantId = restaurantId,
                    RoleName = role
                });
            }

            await _tenantDb.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Added roles {Roles} to employee {EmployeeId} in restaurant {RestaurantId} by user {UserId}",
                string.Join(",", toAdd), employeeId, restaurantId, userId);
        }
    }

    public async Task RemoveEmployeeRoleAsync(
        Guid userId,
        string restaurantId,
        Guid employeeId,
        string role,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(role);

        if (!await _tenantDb.IsTenantAdminAsync(userId, restaurantId, ct))
        {
            throw new UnauthorizedAccessException($"User {userId} is not an admin of restaurant {restaurantId}");
        }

        var row = await _tenantDb.RestaurantUserRoles
            .FirstOrDefaultAsync(r => r.RestaurantId == restaurantId && r.UserId == employeeId && r.RoleName == role, ct);
        if (row is null)
        {
            throw new KeyNotFoundException($"Role assignment not found");
        }

        _tenantDb.RestaurantUserRoles.Remove(row);
        await _tenantDb.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Removed role {Role} from employee {EmployeeId} in restaurant {RestaurantId} by user {UserId}",
            role, employeeId, restaurantId, userId);
    }

    public async Task AddEmployeeAsync(
        Guid userId,
        string restaurantId,
        AddEmployeeDto dto,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(dto);

        if (!await _tenantDb.IsTenantAdminAsync(userId, restaurantId, ct))
        {
            throw new UnauthorizedAccessException($"User {userId} is not an admin of restaurant {restaurantId}");
        }

        var user = await _userRepository.GetByIdAsync(dto.UserId);
        if (user is null)
        {
            throw new KeyNotFoundException($"User {dto.UserId} not found");
        }

        if (!string.IsNullOrEmpty(dto.DefaultLocationId))
        {
            var locOk = await _locationRepository.GetByIdAsync(dto.DefaultLocationId);
            if (locOk is null || locOk.RestaurantId != restaurantId)
            {
                throw new ArgumentException("DefaultLocationId is invalid for this restaurant");
            }
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

        if (dto.Roles is not null && dto.Roles.Count > 0)
        {
            var incoming = dto.Roles
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .Select(r => r.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

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

        _logger.LogInformation(
            "Added employee {EmployeeId} to restaurant {RestaurantId} by user {UserId}",
            dto.UserId, restaurantId, userId);
    }

    public async Task UpdateEmployeeDefaultLocationAsync(
        Guid userId,
        string restaurantId,
        Guid employeeId,
        DefaultLocationUpdateDto dto,
        CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(dto);

        if (!await _tenantDb.IsTenantAdminAsync(userId, restaurantId, ct))
        {
            throw new UnauthorizedAccessException($"User {userId} is not an admin of restaurant {restaurantId}");
        }

        var membership = await _tenantDb.RestaurantMemberships
            .FirstOrDefaultAsync(m => m.RestaurantId == restaurantId && m.UserId == employeeId, ct);
        if (membership is null)
        {
            throw new KeyNotFoundException($"Employee {employeeId} not found in restaurant {restaurantId}");
        }

        var location = await _locationRepository.GetByIdAsync(dto.DefaultLocationId);
        if (location is null || location.RestaurantId != restaurantId)
        {
            throw new ArgumentException("DefaultLocationId is invalid for this restaurant");
        }

        membership.DefaultLocationId = dto.DefaultLocationId;
        await _tenantDb.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Updated default location for employee {EmployeeId} in restaurant {RestaurantId}",
            employeeId, restaurantId);
    }

    public async Task<IReadOnlyCollection<string>> GetAvailableRolesAsync(CancellationToken ct = default)
    {
        return new[]
        {
            TenantRoles.TenantOwner,
            TenantRoles.TenantAdmin,
            TenantRoles.TenantManager,
            TenantRoles.TenantServer,
            TenantRoles.TenantChef,
            TenantRoles.TenantCashier,
            TenantRoles.TenantHost
        };
    }
}
