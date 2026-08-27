using System.Threading.Tasks;
using IdentityService.Entities;
using IdentityService.Common.Settings;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Configuration;
using Duende.IdentityServer.Services;

namespace IdentityService.Areas.Identity.Pages.Account;

public class LogoutModel : PageModel
{
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ILogger<LogoutModel> _logger;
    private readonly IConfiguration _config;
    private readonly IIdentityServerInteractionService _interaction;

    public LogoutModel(SignInManager<ApplicationUser> signInManager, ILogger<LogoutModel> logger, IConfiguration config, IIdentityServerInteractionService interaction)
    {
        _signInManager = signInManager;
        _logger = logger;
        _config = config;
        _interaction = interaction;
    }

    // Duende's /connect/endsession redirects here (GET, with logoutId) to complete
    // RP-initiated logout. Without this handler the page just showed a static "signed
    // out" message and stranded the browser here - it never signed the ASP.NET Identity
    // cookie out and never continued back to the client's post_logout_redirect_uri, so the
    // SPA's own logout-callback page was never reached.
    public async Task<IActionResult> OnGet(string? logoutId = null)
    {
        if (User.Identity?.IsAuthenticated == true)
        {
            await _signInManager.SignOutAsync();
            _logger.LogInformation("User logged out.");
        }

        // Our SPA always sends id_token_hint on signoutRedirect(), which lets Duende
        // trust the client and set ShowSignoutPrompt=false - so this redirects straight
        // back rather than requiring a second "yes, sign me out" click.
        var context = await _interaction.GetLogoutContextAsync(logoutId, HttpContext.RequestAborted);
        if (context?.ShowSignoutPrompt == false && !string.IsNullOrEmpty(context.PostLogoutRedirectUri))
        {
            return Redirect(context.PostLogoutRedirectUri);
        }

        return Page();
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
