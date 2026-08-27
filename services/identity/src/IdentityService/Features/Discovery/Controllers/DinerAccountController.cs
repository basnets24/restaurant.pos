using IdentityService.Entities;
using IdentityService.Features.Discovery.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

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
/// Partly hardened. It is rate limited per client address (see <see cref="RateLimitPolicies"/>,
/// and read the caveat there about needing ForwardedHeaders:KnownNetworks set for that address to
/// mean anything behind an ingress). Still missing, and still blocking a genuinely public
/// deployment: there is no CAPTCHA, so a distributed flood is unaffected, and no email
/// verification, so anyone can sign up as an address they don't own.
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
    [EnableRateLimiting(RateLimitPolicies.DinerRegistration)]
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
