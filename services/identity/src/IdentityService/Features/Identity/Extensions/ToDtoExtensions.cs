using IdentityService.Features.Identity.DTOs;
using IdentityService.Entities;

namespace IdentityService.Features.Identity.Extensions;

public static class ToDtoExtensions
{
    public static UserDto ToUserDto(this ApplicationUser user, IEnumerable<string> roles)
    {
        return new UserDto(
            user.Id,
            user.Email,
            user.UserName,
            user.DisplayName,
            roles.ToList());
    }

    public static UserDetailDto ToUserDetailDto(
        this ApplicationUser user,
        IEnumerable<string> roles)
    {
        var lockedOut = user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow;

        return new UserDetailDto(
            user.Id,
            user.Email,
            user.UserName,
            user.DisplayName,
            user.EmailConfirmed,
            user.LockoutEnabled,
            lockedOut,
            user.AccessFailedCount,
            user.TwoFactorEnabled,
            user.LockoutEnd,
            roles);
    }

    public static UserListItemDto ToUserListItemDto(
        this ApplicationUser user,
        IEnumerable<string> roles)
    {
        var lockedOut = user.LockoutEnd.HasValue && user.LockoutEnd > DateTimeOffset.UtcNow;

        return new UserListItemDto(
            user.Id,
            user.Email,
            user.UserName,
            user.DisplayName,
            user.EmailConfirmed,
            lockedOut,
            roles);
    }
}
