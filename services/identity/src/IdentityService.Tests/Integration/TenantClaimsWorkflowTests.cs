using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using System.Security.Claims;
using Duende.IdentityServer.Models;
using Duende.IdentityServer.Services;
using IdentityService.Services;
using Tenant.Domain.Data;
using Tenant.Domain.Entities;
using Xunit;

namespace IdentityService.Tests.Integration;

/// <summary>
/// Critical integration test for end-to-end tenant claims workflow.
/// This test simulates the actual IdentityServer token issuance process.
/// </summary>
public class TenantClaimsWorkflowTests : IDisposable
{
    private readonly TenantDbContext _tenantContext;
    private readonly EmbeddedTenantDirectory _directory;
    private readonly DbTenantClaimsProvider _claimsProvider;
    private readonly TenantProfileService _profileService;
    private readonly Guid _testUserId = Guid.NewGuid();

    public TenantClaimsWorkflowTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<TenantDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        
        _tenantContext = new TenantDbContext(options);
        
        // Setup services with real implementations
        var logger1 = NullLogger<EmbeddedTenantDirectory>.Instance;
        var logger2 = NullLogger<DbTenantClaimsProvider>.Instance;
        var logger3 = NullLogger<TenantProfileService>.Instance;
        
        _directory = new EmbeddedTenantDirectory(_tenantContext, logger1);
        _claimsProvider = new DbTenantClaimsProvider(_directory, logger2);
        _profileService = new TenantProfileService(_claimsProvider, logger3);
    }

    [Fact]
    public async Task EndToEnd_HappyPath_IssuesCorrectTenantClaims()
    {
        // Arrange: Create realistic tenant scenario
        await SeedTenantData();
        
        var subject = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("sub", _testUserId.ToString())
        }));
        
        var context = new ProfileDataRequestContext(
            subject, 
            new Client(), 
            "test",
            new[] { "restaurant_id", "location_id", "role" });

        // Act: Simulate IdentityServer calling profile service
        await _profileService.GetProfileDataAsync(context);

        // Assert: Verify correct claims issued
        var issuedClaims = context.IssuedClaims;
        
        var restaurantClaim = issuedClaims.FirstOrDefault(c => c.Type == TenantProfileService.RestaurantIdClaim);
        var locationClaim = issuedClaims.FirstOrDefault(c => c.Type == TenantProfileService.LocationIdClaim);
        var roleClaims = issuedClaims.Where(c => c.Type == "role").ToList();

        Assert.NotNull(restaurantClaim);
        Assert.Equal("restaurant-1", restaurantClaim.Value);
        
        Assert.NotNull(locationClaim);
        Assert.Equal("location-main", locationClaim.Value);
        
        Assert.Equal(2, roleClaims.Count);
        Assert.Contains(roleClaims, c => c.Value == "Manager");
        Assert.Contains(roleClaims, c => c.Value == "Server");
    }

    [Fact]
    public async Task EndToEnd_NoMembership_IssuesNoClaims()
    {
        // Arrange: User with no tenant membership
        var subject = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("sub", Guid.NewGuid().ToString()) // Different user, no membership
        }));
        
        var context = new ProfileDataRequestContext(
            subject, 
            new Client(), 
            "test",
            new[] { "restaurant_id", "location_id", "role" });

        // Act
        await _profileService.GetProfileDataAsync(context);

        // Assert: No tenant claims issued
        var issuedClaims = context.IssuedClaims;
        Assert.Empty(issuedClaims.Where(c => c.Type == TenantProfileService.RestaurantIdClaim));
        Assert.Empty(issuedClaims.Where(c => c.Type == TenantProfileService.LocationIdClaim));
        Assert.Empty(issuedClaims.Where(c => c.Type == "role"));
    }

    [Fact]
    public async Task EndToEnd_MultipleRestaurants_SelectsMostRecent()
    {
        // Arrange: User with multiple restaurant memberships
        await SeedMultiRestaurantData();
        
        var subject = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("sub", _testUserId.ToString())
        }));
        
        var context = new ProfileDataRequestContext(
            subject, 
            new Client(), 
            "test",
            new[] { "restaurant_id", "location_id", "role" });

        // Act
        await _profileService.GetProfileDataAsync(context);

        // Assert: Should select restaurant-2 (more recent membership)
        var restaurantClaim = context.IssuedClaims.FirstOrDefault(c => c.Type == TenantProfileService.RestaurantIdClaim);
        Assert.NotNull(restaurantClaim);
        Assert.Equal("restaurant-2", restaurantClaim.Value);
        
        // Should only have roles from restaurant-2
        var roleClaims = context.IssuedClaims.Where(c => c.Type == "role").ToList();
        Assert.Single(roleClaims);
        Assert.Equal("Owner", roleClaims[0].Value);
    }

    [Fact]
    public async Task EndToEnd_LocationFallback_UsesFirstActiveLocation()
    {
        // Arrange: User membership without default location
        await SeedLocationFallbackData();
        
        var subject = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("sub", _testUserId.ToString())
        }));
        
        var context = new ProfileDataRequestContext(
            subject, 
            new Client(), 
            "test",
            new[] { "restaurant_id", "location_id", "role" });

        // Act
        await _profileService.GetProfileDataAsync(context);

        // Assert: Should fallback to first active location
        var locationClaim = context.IssuedClaims.FirstOrDefault(c => c.Type == TenantProfileService.LocationIdClaim);
        Assert.NotNull(locationClaim);
        Assert.Equal("location-branch-a", locationClaim.Value); // First by CreatedUtc
    }

    [Fact]
    public async Task EndToEnd_RoleReplacement_RemovesExistingRoles()
    {
        // Arrange: Context with pre-existing global roles
        await SeedTenantData();
        
        var subject = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("sub", _testUserId.ToString())
        }));
        
        var context = new ProfileDataRequestContext(
            subject, 
            new Client(), 
            "test",
            new[] { "restaurant_id", "location_id", "role" })
        {
            IssuedClaims = new List<Claim>
            {
                new Claim("role", "GlobalAdmin"), // Pre-existing global role
                new Claim("role", "SystemUser")   // Another pre-existing role
            }
        };

        // Act
        await _profileService.GetProfileDataAsync(context);

        // Assert: Global roles should be replaced with tenant roles
        var roleClaims = context.IssuedClaims.Where(c => c.Type == "role").ToList();
        Assert.Equal(2, roleClaims.Count);
        Assert.Contains(roleClaims, c => c.Value == "Manager");
        Assert.Contains(roleClaims, c => c.Value == "Server");
        
        // Global roles should be gone
        Assert.DoesNotContain(roleClaims, c => c.Value == "GlobalAdmin");
        Assert.DoesNotContain(roleClaims, c => c.Value == "SystemUser");
    }

    private async Task SeedTenantData()
    {
        var restaurant = new Restaurant 
        { 
            Id = "restaurant-1", 
            Name = "Test Restaurant", 
            CreatedUtc = DateTime.UtcNow.AddDays(-10) 
        };
        
        var location = new Location 
        { 
            Id = "location-main", 
            RestaurantId = "restaurant-1", 
            Name = "Main Location", 
            IsActive = true,
            CreatedUtc = DateTime.UtcNow.AddDays(-9)
        };
        
        var membership = new RestaurantMembership 
        { 
            Id = "membership-1",
            UserId = _testUserId, 
            RestaurantId = "restaurant-1",
            DefaultLocationId = "location-main",
            CreatedUtc = DateTime.UtcNow.AddDays(-8)
        };
        
        var roles = new[]
        {
            new RestaurantUserRole 
            { 
                Id = "role-1",
                UserId = _testUserId, 
                RestaurantId = "restaurant-1", 
                RoleName = "Manager" 
            },
            new RestaurantUserRole 
            { 
                Id = "role-2",
                UserId = _testUserId, 
                RestaurantId = "restaurant-1", 
                RoleName = "Server" 
            }
        };

        _tenantContext.Restaurants.Add(restaurant);
        _tenantContext.Locations.Add(location);
        _tenantContext.RestaurantMemberships.Add(membership);
        _tenantContext.RestaurantUserRoles.AddRange(roles);
        
        await _tenantContext.SaveChangesAsync();
    }

    private async Task SeedMultiRestaurantData()
    {
        var restaurants = new[]
        {
            new Restaurant { Id = "restaurant-1", Name = "First Restaurant", CreatedUtc = DateTime.UtcNow.AddDays(-10) },
            new Restaurant { Id = "restaurant-2", Name = "Second Restaurant", CreatedUtc = DateTime.UtcNow.AddDays(-5) }
        };

        var memberships = new[]
        {
            new RestaurantMembership 
            { 
                Id = "membership-1",
                UserId = _testUserId, 
                RestaurantId = "restaurant-1",
                CreatedUtc = DateTime.UtcNow.AddDays(-8) // Older
            },
            new RestaurantMembership 
            { 
                Id = "membership-2",
                UserId = _testUserId, 
                RestaurantId = "restaurant-2",
                CreatedUtc = DateTime.UtcNow.AddDays(-3) // Newer - should be selected
            }
        };

        var roles = new[]
        {
            new RestaurantUserRole { Id = "role-1", UserId = _testUserId, RestaurantId = "restaurant-1", RoleName = "Manager" },
            new RestaurantUserRole { Id = "role-2", UserId = _testUserId, RestaurantId = "restaurant-2", RoleName = "Owner" }
        };

        var locations = new[]
        {
            new Location { Id = "location-1", RestaurantId = "restaurant-1", Name = "First Location", IsActive = true, CreatedUtc = DateTime.UtcNow.AddDays(-9) },
            new Location { Id = "location-2", RestaurantId = "restaurant-2", Name = "Second Location", IsActive = true, CreatedUtc = DateTime.UtcNow.AddDays(-4) }
        };

        _tenantContext.Restaurants.AddRange(restaurants);
        _tenantContext.RestaurantMemberships.AddRange(memberships);
        _tenantContext.RestaurantUserRoles.AddRange(roles);
        _tenantContext.Locations.AddRange(locations);

        await _tenantContext.SaveChangesAsync();
    }

    private async Task SeedLocationFallbackData()
    {
        var restaurant = new Restaurant 
        { 
            Id = "restaurant-fallback", 
            Name = "Fallback Restaurant", 
            CreatedUtc = DateTime.UtcNow.AddDays(-10) 
        };

        // Membership without default location
        var membership = new RestaurantMembership 
        { 
            Id = "membership-fallback",
            UserId = _testUserId, 
            RestaurantId = "restaurant-fallback",
            DefaultLocationId = null, // No default location
            CreatedUtc = DateTime.UtcNow.AddDays(-8)
        };

        // Multiple locations - should pick first by CreatedUtc
        var locations = new[]
        {
            new Location 
            { 
                Id = "location-branch-a", 
                RestaurantId = "restaurant-fallback", 
                Name = "Branch A", 
                IsActive = true,
                CreatedUtc = DateTime.UtcNow.AddDays(-7) // Earlier - should be selected
            },
            new Location 
            { 
                Id = "location-branch-b", 
                RestaurantId = "restaurant-fallback", 
                Name = "Branch B", 
                IsActive = true,
                CreatedUtc = DateTime.UtcNow.AddDays(-6) // Later
            }
        };

        var role = new RestaurantUserRole 
        { 
            Id = "role-fallback",
            UserId = _testUserId, 
            RestaurantId = "restaurant-fallback", 
            RoleName = "Staff" 
        };

        _tenantContext.Restaurants.Add(restaurant);
        _tenantContext.RestaurantMemberships.Add(membership);
        _tenantContext.Locations.AddRange(locations);
        _tenantContext.RestaurantUserRoles.Add(role);

        await _tenantContext.SaveChangesAsync();
    }

    public void Dispose()
    {
        _tenantContext?.Dispose();
    }
}