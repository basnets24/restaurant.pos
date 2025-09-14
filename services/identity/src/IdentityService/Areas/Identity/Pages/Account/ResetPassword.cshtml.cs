using System.ComponentModel.DataAnnotations;
using System.Text;
using IdentityService.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.WebUtilities;

namespace IdentityService.Areas.Identity.Pages.Account;

public class ResetPasswordModel : PageModel
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<ResetPasswordModel> _logger;

    public ResetPasswordModel(UserManager<ApplicationUser> userManager, ILogger<ResetPasswordModel> logger)
    {
        _userManager = userManager;
        _logger = logger;
    }

    [BindProperty]
    public InputModel Input { get; set; } = new();

    public bool Done { get; set; }

    public class InputModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [DataType(DataType.Password)]
        [StringLength(100, MinimumLength = 6)]
        public string Password { get; set; } = string.Empty;

        [DataType(DataType.Password)]
        [Compare("Password", ErrorMessage = "The password and confirmation password do not match.")]
        public string ConfirmPassword { get; set; } = string.Empty;

        [Required]
        public string Code { get; set; } = string.Empty;
    }

    public IActionResult OnGet(string? code = null, string? email = null)
    {
        if (code == null || email == null) return BadRequest();
        Input.Email = email;
        Input.Code = code;
        return Page();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid) return Page();
        var user = await _userManager.FindByEmailAsync(Input.Email);
        if (user == null)
        {
            Done = true; // Do not reveal that the user does not exist
            return Page();
        }
        var decoded = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(Input.Code));
        var result = await _userManager.ResetPasswordAsync(user, decoded, Input.Password);
        if (result.Succeeded)
        {
            Done = true;
            return Page();
        }
        foreach (var e in result.Errors)
            ModelState.AddModelError(string.Empty, e.Description);
        return Page();
    }
}

