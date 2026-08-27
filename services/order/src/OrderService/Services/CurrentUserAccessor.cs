using System.Security.Claims;
using OrderService.Interfaces;

namespace OrderService.Services;

public class CurrentUserAccessor : ICurrentUserAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal User =>
        _httpContextAccessor.HttpContext?.User
        ?? throw new UnauthorizedAccessException("No authenticated user in the current request.");

    public Guid UserId
    {
        get
        {
            var sub = User.FindFirstValue("sub")
                ?? throw new UnauthorizedAccessException("Missing 'sub' claim.");
            return Guid.Parse(sub);
        }
    }

    public string DisplayName =>
        User.FindFirstValue("name") ?? User.FindFirstValue("preferred_username") ?? "Server";
}
