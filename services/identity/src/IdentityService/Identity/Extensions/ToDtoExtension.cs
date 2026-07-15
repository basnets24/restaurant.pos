using IdentityService.Entities;

namespace IdentityService.Extensions;

public static class ToDtoExtension
{
    public static UserDto ToUserDto(this ApplicationUser user, 
        IEnumerable<string> roles)
        => new UserDto(user.Id, user.UserName, user.Email, user.DisplayName,
            roles.OrderBy(r => r).ToArray()); 
    
    public static UserDetailDto ToDto(
        this ApplicationUser user, 
        IEnumerable<string> roles) =>
        new(
            Id: user.Id,
            Email: user.Email,
            UserName: user.UserName,
            DisplayName: user.DisplayName,
            EmailConfirmed: user.EmailConfirmed,
            LockoutEnabled: user.LockoutEnabled,
            LockedOut: user.LockoutEnabled && user.LockoutEnd.HasValue,
            AccessFailedCount: user.AccessFailedCount,
            TwoFactorEnabled: user.TwoFactorEnabled,
            LockoutEnd: user.LockoutEnd,
            Roles: roles
        );
    
    
}