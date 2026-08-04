using IdentityService.Entities;
using IdentityService.Features.Discovery.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace IdentityService.Features.Discovery.Controllers;

/// <summary>
/// Diner self-signup. Anonymous by necessity - there is nobody to authorize as yet - which
/// makes it the only write endpoint on the platform's public surface. Treat it accordingly:
/// it creates an account and nothing else. No roles, no tenant membership, no claims.
///
/// The account it creates can only ever be used through the <c>spoontab-diner</c> client, which
/// is the only client allowed to request the <c>diner</c> scope; a diner signing in through the
/// staff client would get a token with no usable scope at all.
///
/// Not hardened against abuse: there is no rate limit, no CAPTCHA and no email verification, so
/// this will happily mint unlimited accounts. Acceptable for a demo platform, not for the open
/// internet - see DINER_ORDERING_PLAN.md before deploying this anywhere public.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("public/diner")]
public class DinerAccountController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly ILogger<DinerAccountController> _logger;

    public DinerAccountController(UserManager<ApplicationUser> users, ILogger<DinerAccountController> logger)
    {
        _users = users;
        _logger = logger;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(DinerRegistrationDto dto)
    {
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = dto.Email,
            Email = dto.Email,
            DisplayName = string.IsNullOrWhiteSpace(dto.DisplayName) ? null : dto.DisplayName.Trim(),
        };

        var result = await _users.CreateAsync(user, dto.Password);
        if (result.Succeeded)
        {
            _logger.LogInformation("Diner account created for {Email}", dto.Email);
            return NoContent();
        }

        // Password-policy failures are the caller's to fix, so they come back verbatim.
        // A duplicate email does not: saying so would turn this into an account-existence
        // oracle for anyone with an email list. The generic message covers both.
        var passwordProblems = result.Errors
            .Where(e => e.Code.StartsWith("Password", StringComparison.Ordinal))
            .Select(e => e.Description)
            .ToList();

        return BadRequest(new
        {
            message = passwordProblems.Count > 0
                ? string.Join(" ", passwordProblems)
                : "That account could not be created. Try signing in instead."
        });
    }
}
