using System.Linq;
using Tenant.Domain.Data;
using IdentityService.Entities;
using Tenant.Domain.Contracts;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Services;

public class TenantUserProfileService
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly TenantDbContext _tenantDb;

    public TenantUserProfileService(UserManager<ApplicationUser> users, TenantDbContext tenantDb)
    {
        _users = users;
        _tenantDb = tenantDb;
    }

    public async Task<TenantUserProfileDto?> GetAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _users.FindByIdAsync(userId.ToString());
        if (user is null) return null;

        // Global roles from ASP.NET Identity
        var roles = await _users.GetRolesAsync(user);

        var memberships = await _tenantDb.RestaurantMemberships
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.CreatedUtc)
            .Select(m => new TenantMembershipDto(m.RestaurantId, m.DefaultLocationId, m.CreatedUtc))
            .ToListAsync(ct);

        var restaurantIds = memberships.Select(m => m.RestaurantId).Distinct().ToArray();

        var tenantRoles = await _tenantDb.RestaurantUserRoles
            .AsNoTracking()
            .Where(r => r.UserId == userId && restaurantIds.Contains(r.RestaurantId))
            .Select(r => new TenantRoleDto(r.RestaurantId, r.RoleName))
            .ToListAsync(ct);

        var restaurants = await _tenantDb.Restaurants
            .AsNoTracking()
            .Where(r => restaurantIds.Contains(r.Id))
            .Select(r => new TenantRestaurantDto(r.Id, r.Name, r.Slug, r.IsActive, r.CreatedUtc))
            .ToListAsync(ct);

        var locations = await _tenantDb.Locations
            .AsNoTracking()
            .Where(l => restaurantIds.Contains(l.RestaurantId))
            .Select(l => new TenantLocationDto(l.Id, l.RestaurantId, l.Name, l.IsActive, l.CreatedUtc, l.TimeZoneId))
            .ToListAsync(ct);

        var lockedOut = user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow;

        return new TenantUserProfileDto(
            user.Id,                // keep your existing DTO contract
            user.Email,
            user.UserName,
            user.DisplayName,
            user.EmailConfirmed,
            lockedOut,
            roles.ToArray(),
            memberships,
            tenantRoles,            // all roles across restaurants (rid, role)
            restaurants,
            locations
        );
    }
}
