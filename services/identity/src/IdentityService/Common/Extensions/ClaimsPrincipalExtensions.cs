using System.Security.Claims;

namespace IdentityService.Common.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static bool TryGetUserId(this ClaimsPrincipal user, out Guid userId)
        => Guid.TryParse(user.FindFirst("sub")?.Value, out userId);
}
