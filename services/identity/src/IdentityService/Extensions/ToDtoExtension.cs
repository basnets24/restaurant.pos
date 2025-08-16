using IdentityService.Entities;

namespace IdentityService.Extensions;

public static class ToDtoExtension
{
    public static UserDto ToUserDto(this ApplicationUser user, 
        IEnumerable<string> roles)
        => new UserDto(user.Id, user.UserName, user.Email, roles.OrderBy(r => r).ToArray()); 
    
    public static UserDetailDto ToDto(
        this ApplicationUser user, 
        IEnumerable<string> roles) =>
        new(
            Id: user.Id,
            UserName: user.UserName,
            Email: user.Email,
            EmailConfirmed: user.EmailConfirmed,
            LockedOut: user.LockoutEnabled,
            LockoutEnd: user.LockoutEnd,
            Roles: roles
        );
    
    
}