using IdentityService.Data;
using IdentityService.Entities;
using IdentityService.Features.Tenancy.DTOs;
using IdentityService.Features.Tenancy.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Tenant.Domain;
using Tenant.Domain.Data;
using Tenant.Domain.Entities;
using Xunit;

namespace IdentityService.Integration.Tests.Features.Tenancy;

/// <summary>
/// CRITICAL AUTH TESTS
/// Verifies that only admins can perform sensitive operations.
/// Tests role-based authorization in multi-tenant context.
/// </summary>
[Collection("Database collection")]
public class RoleBasedAuthorizationTests : IAsyncLifetime
{
    private readonly TestDatabaseFixture _fixture;
    private ITenantService _tenantService = null!;
    private TenantDbContext _tenantDb = null!;

    public RoleBasedAuthorizationTests(TestDatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task CreateLocation_UserNotAdmin_ThrowsInvalidOperationException()
    {
        // SCENARIO: Regular employee tries to create location in restaurant
        // Should fail - only admins can modify restaurant settings

        var employee = new ApplicationUser { UserName = "employee@example.com", Email = "employee@example.com" };
        var restaurant = new Restaurant { Name = "Test Restaurant" };

        _fixture.DbContext.Users.Add(employee);
        await _fixture.DbContext.SaveChangesAsync();

        _tenantDb.Restaurants.Add(restaurant);

        // Assign "Server" role, NOT admin
        _tenantDb.RestaurantUserRoles.Add(
            new RestaurantUserRole { UserId = employee.Id, RestaurantId = restaurant.Id, RoleName = TenantRoles.TenantServer }
        );
        _tenantDb.RestaurantMemberships.Add(
            new RestaurantMembership { UserId = employee.Id, RestaurantId = restaurant.Id }
        );

        await _tenantDb.SaveChangesAsync();

        // Act & Assert
        var dto = new CreateLocationDto("New Location", "America/Chicago");
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _tenantService.CreateLocationAsync(employee.Id, restaurant.Id, dto, default)
        );

        // Verify error is about authorization, not something else
        Assert.Contains("admin", ex.Message.ToLower());
    }

    [Fact]
    public async Task CreateLocation_AdminOfDifferentRestaurant_ThrowsInvalidOperationException()
    {
        // SCENARIO: Alice is admin of Restaurant A
        //           Alice tries to create location in Restaurant B
        //           Should fail - roles are per-restaurant, not global

        var alice = new ApplicationUser { UserName = "alice@example.com", Email = "alice@example.com" };
        var restaurantA = new Restaurant { Name = "Restaurant A" };
        var restaurantB = new Restaurant { Name = "Restaurant B" };

        _fixture.DbContext.Users.Add(alice);
        await _fixture.DbContext.SaveChangesAsync();

        _tenantDb.Restaurants.AddRange(restaurantA, restaurantB);

        // Alice is ADMIN in Restaurant A
        _tenantDb.RestaurantUserRoles.Add(
            new RestaurantUserRole { UserId = alice.Id, RestaurantId = restaurantA.Id, RoleName = TenantRoles.TenantAdmin }
        );

        // Alice is member but NOT admin in Restaurant B
        _tenantDb.RestaurantMemberships.AddRange(
            new RestaurantMembership { UserId = alice.Id, RestaurantId = restaurantA.Id },
            new RestaurantMembership { UserId = alice.Id, RestaurantId = restaurantB.Id }
        );

        await _tenantDb.SaveChangesAsync();

        // Act & Assert - Try to create location in B where she's NOT admin
        var dto = new CreateLocationDto("Unauthorized Location", "America/Chicago");
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _tenantService.CreateLocationAsync(alice.Id, restaurantB.Id, dto, default)
        );
    }

    [Fact]
    public async Task CreateLocation_AdminOfRestaurant_Succeeds()
    {
        // SCENARIO: Alice IS admin of Restaurant A
        //           Alice creates location
        //           Should succeed

        var alice = new ApplicationUser { UserName = "alice@example.com", Email = "alice@example.com" };
        var restaurant = new Restaurant { Name = "Restaurant A" };

        _fixture.DbContext.Users.Add(alice);
        await _fixture.DbContext.SaveChangesAsync();

        _tenantDb.Restaurants.Add(restaurant);
        _tenantDb.RestaurantUserRoles.Add(
            new RestaurantUserRole { UserId = alice.Id, RestaurantId = restaurant.Id, RoleName = TenantRoles.TenantAdmin }
        );
        _tenantDb.RestaurantMemberships.Add(
            new RestaurantMembership { UserId = alice.Id, RestaurantId = restaurant.Id }
        );

        await _tenantDb.SaveChangesAsync();

        // Act
        var dto = new CreateLocationDto("Main Location", "America/Chicago");
        var result = await _tenantService.CreateLocationAsync(alice.Id, restaurant.Id, dto, default);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Main Location", result.Name);
        Assert.Equal(restaurant.Id, result.RestaurantId);
    }

    [Fact]
    public async Task UpdateLocation_AdminOnly_Enforced()
    {
        // SCENARIO: Non-admin tries to update location
        //           Should fail

        var employee = new ApplicationUser { UserName = "employee@example.com", Email = "employee@example.com" };
        var restaurant = new Restaurant { Name = "Restaurant A" };
        var location = new Location { RestaurantId = restaurant.Id, Name = "Old Name", TimeZoneId = "America/Chicago" };

        _fixture.DbContext.Users.Add(employee);
        await _fixture.DbContext.SaveChangesAsync();

        _tenantDb.Restaurants.Add(restaurant);
        _tenantDb.Locations.Add(location);
        _tenantDb.RestaurantUserRoles.Add(
            new RestaurantUserRole { UserId = employee.Id, RestaurantId = restaurant.Id, RoleName = TenantRoles.TenantServer }
        );
        _tenantDb.RestaurantMemberships.Add(
            new RestaurantMembership { UserId = employee.Id, RestaurantId = restaurant.Id }
        );

        await _tenantDb.SaveChangesAsync();

        // Act & Assert
        var dto = new UpdateLocationDto("New Name", true, "America/New_York");
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _tenantService.UpdateLocationAsync(employee.Id, restaurant.Id, location.Id, dto, default)
        );
    }

    public async Task InitializeAsync()
    {
        await _fixture.InitializeAsync();
        _tenantDb = new TenantDbContext(
            new Microsoft.EntityFrameworkCore.DbContextOptions<TenantDbContext>()
                .UseNpgsql("Host=localhost;Port=5432;Database=tenant_service_test;Username=postgres;Password=postgres")
                .Options
        );

        var tenantRepository = new IdentityService.Features.Tenancy.Repositories.TenantRepository(_tenantDb);
        var locationRepository = new IdentityService.Features.Tenancy.Repositories.LocationRepository(_tenantDb);

        _tenantService = new TenantService(
            tenantRepository,
            locationRepository,
            _tenantDb,
            NullLogger<TenantService>.Instance
        );
    }

    public Task DisposeAsync() => _fixture.DisposeAsync();
}
