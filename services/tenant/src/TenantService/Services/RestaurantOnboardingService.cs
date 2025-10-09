using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Tenant.Domain.Data;
using Tenant.Domain.Entities;
using Tenant.Domain;
using TenantService.Validation;

namespace TenantService.Services;

public record OnboardRestaurantReq(
    [Required(ErrorMessage = "Restaurant name is required")]
    [StringLength(200, MinimumLength = 2, ErrorMessage = "Restaurant name must be between 2 and 200 characters")]
    [RegularExpression(@"^[a-zA-Z0-9\s\-_.()&']+$", ErrorMessage = "Restaurant name contains invalid characters")]
    [SafeName]
    string Name,

    [StringLength(100, ErrorMessage = "Location name cannot exceed 100 characters")]
    [RegularExpression(@"^[a-zA-Z0-9\s\-_.()]+$", ErrorMessage = "Location name contains invalid characters")]
    [SafeName]
    string? LocationName,

    [StringLength(100, ErrorMessage = "Time zone ID cannot exceed 100 characters")]
    [ValidTimeZone]
    string? TimeZoneId
);

public record OnboardRestaurantRes(string RestaurantId, string LocationId);

public record JoinRestaurantReq(
    [Required(ErrorMessage = "Join code is required")]
    [StringLength(100, MinimumLength = 3, ErrorMessage = "Join code must be between 3 and 100 characters")]
    [RegularExpression(@"^[a-zA-Z0-9\-_]+$", ErrorMessage = "Join code contains invalid characters")]
    [SafeName]
    string Code
);

public record JoinCodeRes(string RestaurantId, string? Slug);

public class RestaurantOnboardingService
{
    private readonly TenantDbContext _db;
    private readonly ILogger<RestaurantOnboardingService> _logger;

    public RestaurantOnboardingService(TenantDbContext db, ILogger<RestaurantOnboardingService> logger)
    { _db = db; _logger = logger; }

    public async Task<OnboardRestaurantRes> OnboardAsync(Guid userId, OnboardRestaurantReq req, CancellationToken ct)
    {
        // Sanitize and validate input
        var sanitizedName = SanitizeInput(req.Name.Trim());
        var sanitizedLocationName = string.IsNullOrWhiteSpace(req.LocationName)
            ? "Main"
            : SanitizeInput(req.LocationName.Trim());

        // Validate business rules
        await ValidateRestaurantNameIsUniqueAsync(sanitizedName, ct);

        var r = new Restaurant { Name = sanitizedName, Slug = Slugify(sanitizedName) };
        var loc = new Location
        {
            RestaurantId = r.Id,
            Name = sanitizedLocationName,
            TimeZoneId = req.TimeZoneId
        };

        _db.Restaurants.Add(r);
        _db.Locations.Add(loc);
        _db.RestaurantMemberships.Add(new RestaurantMembership { UserId = userId, RestaurantId = r.Id, DefaultLocationId = loc.Id });
        _db.RestaurantUserRoles.Add(new RestaurantUserRole { UserId = userId, RestaurantId = r.Id, RoleName = TenantRoles.TenantAdmin });
        _db.RestaurantUserRoles.Add(new RestaurantUserRole { UserId = userId, RestaurantId = r.Id, RoleName = TenantRoles.TenantOwner });

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Onboarded restaurant {RestaurantId} with location {LocationId} by user {UserId}", r.Id, loc.Id, userId);
        return new OnboardRestaurantRes(r.Id, loc.Id);
    }

    public async Task<OnboardRestaurantRes> JoinByCodeAsync(Guid userId, string code, CancellationToken ct)
    {
        code = code.Trim();
        var restaurant = await _db.Restaurants.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == code || r.Slug == code, ct);
        if (restaurant is null)
        {
            _logger.LogWarning("JoinByCode failed: code {Code} not found for user {UserId}", code, userId);
            throw new InvalidOperationException("Invalid join code.");
        }

        var locId = await _db.Locations.AsNoTracking()
            .Where(l => l.RestaurantId == restaurant.Id && l.IsActive)
            .OrderBy(l => l.CreatedUtc)
            .Select(l => l.Id)
            .FirstOrDefaultAsync(ct);
        if (string.IsNullOrEmpty(locId))
        {
            _logger.LogWarning("JoinByCode failed: no active locations for restaurant {RestaurantId}", restaurant.Id);
            throw new InvalidOperationException("Restaurant has no active locations.");
        }

        var existing = await _db.RestaurantMemberships.FirstOrDefaultAsync(m => m.UserId == userId && m.RestaurantId == restaurant.Id, ct);
        if (existing is null)
        {
            _db.RestaurantMemberships.Add(new RestaurantMembership { UserId = userId, RestaurantId = restaurant.Id, DefaultLocationId = locId });
            _db.RestaurantUserRoles.Add(new RestaurantUserRole { UserId = userId, RestaurantId = restaurant.Id, RoleName = "Server" });
            await _db.SaveChangesAsync(ct);
        }

        return new OnboardRestaurantRes(restaurant.Id, locId);
    }

    public async Task<JoinCodeRes?> GetMyJoinCodeAsync(Guid userId, CancellationToken ct)
    {
        var m = await _db.RestaurantMemberships.AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedUtc)
            .FirstOrDefaultAsync(ct);
        if (m is null) return null;

        var r = await _db.Restaurants.AsNoTracking()
            .Where(x => x.Id == m.RestaurantId)
            .Select(x => new { x.Id, x.Slug })
            .FirstOrDefaultAsync(ct);
        if (r is null) return null;

        return new JoinCodeRes(r.Id, r.Slug);
    }

    private async Task ValidateRestaurantNameIsUniqueAsync(string name, CancellationToken ct)
    {
        var exists = await _db.Restaurants.AnyAsync(r => r.Name == name, ct);
        if (exists)
        {
            throw new InvalidOperationException($"A restaurant with the name '{name}' already exists.");
        }
    }

    private static string SanitizeInput(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return input;

        // Remove potentially dangerous characters but keep normal business text
        var sanitized = input
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&#x27;")
            .Replace("&", "&amp;")
            .Replace("/", "&#x2F;");

        // Remove excessive whitespace
        sanitized = System.Text.RegularExpressions.Regex.Replace(sanitized, @"\s+", " ");

        return sanitized.Trim();
    }

    private static string Slugify(string s) =>
        System.Text.RegularExpressions.Regex.Replace(s.ToLowerInvariant().Trim(), "[^a-z0-9]+", "-").Trim('-');
}

