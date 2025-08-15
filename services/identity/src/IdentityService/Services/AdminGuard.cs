using IdentityService.Auth;
using IdentityService.Entities;
using Microsoft.AspNetCore.Identity;

namespace IdentityService.Services;

public interface IAdminGuard
{
    Task<bool> IsLastAdminAsync(Guid userId, CancellationToken ct = default);
    Task<bool> IsSelfAsync(Guid actorUserId, Guid targetUserId);
}

public sealed class AdminGuard : IAdminGuard
{
    private readonly UserManager<ApplicationUser> _users;
    public AdminGuard(UserManager<ApplicationUser> users) => _users = users;

    public async Task<bool> IsLastAdminAsync(Guid userId, CancellationToken ct = default)
    {
        var admins = await _users.GetUsersInRoleAsync(Roles.Admin);
        if (admins.Count != 1) return false;

        var onlyAdmin = admins[0];
        // ApplicationUser.Id might be Guid or string. Normalize to Guid for compare:
        var onlyAdminId = Guid.Parse(onlyAdmin.Id.ToString());
        return onlyAdminId == userId;
    }

    public Task<bool> IsSelfAsync(Guid actorUserId, Guid targetUserId)
        => Task.FromResult(actorUserId == targetUserId);
}