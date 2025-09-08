
using IdentityService.Auth;
using IdentityService.Data;
using IdentityService.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Services;


public record OnboardRestaurantReq(string Name, string? LocationName, string? TimeZoneId);
public record OnboardRestaurantRes(string RestaurantId, string LocationId);
public record JoinRestaurantReq(string Code);
public record JoinCodeRes(string RestaurantId, string? Slug);

    public class RestaurantOnboardingService
    {
    private readonly TenantDbContext _db;
    private readonly UserManager<ApplicationUser> _users;
    private readonly ILogger<RestaurantOnboardingService> _logger;
    public RestaurantOnboardingService(TenantDbContext db, 
        ILogger<RestaurantOnboardingService> logger, 
        UserManager<ApplicationUser> users)
    { _db = db; _logger = logger;
        _users = users;
    }

    public async Task<OnboardRestaurantRes> OnboardAsync(
        Guid userId, 
        OnboardRestaurantReq req, 
        CancellationToken ct)
    {
        var r = new Restaurant { Name = req.Name.Trim(), Slug = Slugify(req.Name) };
        var loc = new Location
        {
            RestaurantId = r.Id,
            Name = string.IsNullOrWhiteSpace(req.LocationName) ? "Main" : req.LocationName!.Trim(),
            TimeZoneId = req.TimeZoneId
        };

        _db.Restaurants.Add(r);
        _db.Locations.Add(loc);
        _db.RestaurantMemberships.Add(new RestaurantMembership 
            { UserId = userId, RestaurantId = r.Id, DefaultLocationId = loc.Id });
        _db.RestaurantUserRoles.Add(new RestaurantUserRole 
            { UserId = userId, RestaurantId = r.Id, RoleName = TenantRoles.TenantAdmin });
        _db.RestaurantUserRoles.Add(new RestaurantUserRole
            { UserId = userId, RestaurantId = r.Id, RoleName = TenantRoles.TenantOwner }); 

        await _db.SaveChangesAsync(ct);
        var user = await _users.FindByIdAsync(userId.ToString());
        // update the 
        user.CurrentRestaurantId = r.Id;
        user.CurrentLocationId = loc.Id;
        await _users.UpdateAsync(user);
        
        // client should refresh the token after this call 
        _logger.LogInformation("Onboarded restaurant {RestaurantId} with location {LocationId} by user {UserId}", r.Id, loc.Id, userId);
        return new OnboardRestaurantRes(r.Id, loc.Id);
    }

    private static string Slugify(string s) =>
        System.Text.RegularExpressions.Regex.Replace(s.ToLowerInvariant().Trim(), "[^a-z0-9]+", "-").Trim('-');

    public async Task<OnboardRestaurantRes> JoinByCodeAsync(Guid userId, string code, CancellationToken ct)
    {
        code = code.Trim();
        // For MVP: allow joining by restaurant Id or by slug as the "code"
        var restaurant = await _db.Restaurants.AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == code || r.Slug == code, ct);
        if (restaurant is null)
        {
            _logger.LogWarning("JoinByCode failed: code {Code} not found for user {UserId}", code, userId);
            throw new InvalidOperationException("Invalid join code.");
        }

        // Find a default location
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

        // Ensure membership exists
        var existing = await _db.RestaurantMemberships
            .FirstOrDefaultAsync(m => m.UserId == userId && m.RestaurantId == restaurant.Id, ct);
        if (existing is null)
        {
            _db.RestaurantMemberships.Add(new RestaurantMembership
            {
                UserId = userId,
                RestaurantId = restaurant.Id,
                DefaultLocationId = locId
            });
            // Optional default role for joined users
            _db.RestaurantUserRoles.Add(new RestaurantUserRole
            {
                UserId = userId,
                RestaurantId = restaurant.Id,
                RoleName = "Server"
            });
            await _db.SaveChangesAsync(ct);
            var user = await _users.FindByIdAsync(userId.ToString());
            // update the user  
            user.CurrentRestaurantId = restaurant.Id;
            user.CurrentLocationId = locId;
            await _users.UpdateAsync(user);
            _logger.LogInformation("User {UserId} joined restaurant {RestaurantId} with default location {LocationId}", userId, restaurant.Id, locId);
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
}
