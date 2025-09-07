using System.Threading.Tasks;
using IdentityService.Entities;
using IdentityService.Settings;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Configuration;

namespace IdentityService.Areas.Identity.Pages.Account;

public class LogoutModel : PageModel
{
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ILogger<LogoutModel> _logger;
    private readonly IConfiguration _config;

    public LogoutModel(SignInManager<ApplicationUser> signInManager, ILogger<LogoutModel> logger, IConfiguration config)
    {
        _signInManager = signInManager;
        _logger = logger;
        _config = config;
    }

    public async Task<IActionResult> OnPost(string? returnUrl = null)
    {
        await _signInManager.SignOutAsync();
        _logger.LogInformation("User logged out.");

        if (!string.IsNullOrWhiteSpace(returnUrl))
        {
            // Allow local URLs
            if (Url.IsLocalUrl(returnUrl))
                return LocalRedirect(returnUrl);

            // Allow absolute URLs that match configured PostLogoutRedirectUris
            var settings = _config.GetSection("IdentityServerSettings").Get<IdentityServerSettings>();
            var allowed = settings?.Clients
                .SelectMany(c => c.PostLogoutRedirectUris ?? Array.Empty<string>())
                .ToHashSet(StringComparer.OrdinalIgnoreCase) ?? new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            if (allowed.Contains(returnUrl))
                return Redirect(returnUrl);
        }

        // Fallback to first configured PostLogoutRedirectUri if any
        var fallback = _config.GetSection("IdentityServerSettings:Clients:1:PostLogoutRedirectUris:0").Value
                       ?? _config.GetSection("IdentityServerSettings:Clients:0:PostLogoutRedirectUris:0").Value;
        if (!string.IsNullOrEmpty(fallback))
            return Redirect(fallback);

        return Page();
    }
}
