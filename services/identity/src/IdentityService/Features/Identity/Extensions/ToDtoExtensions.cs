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
}
