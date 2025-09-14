using Microsoft.AspNetCore.Mvc.RazorPages;

namespace IdentityService.Areas.Identity.Pages.Account;

public class RegisterConfirmationModel : PageModel
{
    public string Email { get; set; } = string.Empty;
    public string? ReturnUrl { get; set; }

    public void OnGet(string email, string? returnUrl = null)
    {
        Email = email;
        ReturnUrl = returnUrl;
    }
}

