using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Identity;
using IdentityService.Entities;
using Microsoft.Extensions.Configuration;
using Duende.IdentityServer.Services;

namespace IdentityService.Areas.Identity.Pages.Account;

public class LoginModel : PageModel
{
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<LoginModel> _logger;
    private readonly IConfiguration _config;
    private readonly IIdentityServerInteractionService _interaction;

    public LoginModel(SignInManager<ApplicationUser> signInManager,
        UserManager<ApplicationUser> userManager,
        ILogger<LoginModel> logger,
        IConfiguration config,
        IIdentityServerInteractionService interaction)
    {
        _signInManager = signInManager;
        _userManager = userManager;
        _logger = logger;
        _config = config;
        _interaction = interaction;
    }

    [BindProperty]
    public InputModel Input { get; set; } = new();

    [BindProperty(SupportsGet = true)]
    public string? ReturnUrl { get; set; }

    public class InputModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [DataType(DataType.Password)]
        public string Password { get; set; } = string.Empty;

        public bool RememberMe { get; set; }
    }

    public void OnGet(string? returnUrl = null)
    {
        ReturnUrl = returnUrl ?? Url.Content("~/");
    }

    public async Task<IActionResult> OnPostAsync(string? returnUrl = null)
    {
        ReturnUrl = returnUrl ?? Url.Content("~/");
        if (!ModelState.IsValid)
            return Page();

        // Normalize username as email for this app
        var user = await _userManager.FindByEmailAsync(Input.Email);
        var userName = user?.UserName ?? Input.Email;

        var result = await _signInManager.PasswordSignInAsync(
            userName, Input.Password, Input.RememberMe, lockoutOnFailure: true);

        if (result.Succeeded)
        {
            _logger.LogInformation("User logged in.");
            if (!string.IsNullOrWhiteSpace(ReturnUrl) &&
                (_interaction.IsValidReturnUrl(ReturnUrl) || Url.IsLocalUrl(ReturnUrl)))
            {
                return LocalRedirect(ReturnUrl);
            }

            // Fallback to SPA login route with desired join redirect
            var origins = _config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
            var baseUrl = origins.FirstOrDefault() ?? string.Empty;
            if (!string.IsNullOrEmpty(baseUrl))
            {
                if (baseUrl.EndsWith('/')) baseUrl = baseUrl.TrimEnd('/');
                var join = $"{baseUrl}/join";
                var login = $"{baseUrl}/authentication/login?returnUrl={Uri.EscapeDataString(join)}";
                return Redirect(login);
            }

            return LocalRedirect("~/");
        }

        if (result.RequiresTwoFactor)
        {
            // Keep default UI for 2FA unless later customized
            return RedirectToPage("./LoginWith2fa", new { ReturnUrl, Input.RememberMe });
        }

        if (result.IsLockedOut)
        {
            _logger.LogWarning("User account locked out.");
            ModelState.AddModelError(string.Empty, "Account locked. Try again later.");
            return Page();
        }

        ModelState.AddModelError(string.Empty, "Invalid login attempt.");
        return Page();
    }
}
