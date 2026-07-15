using IdentityService.Data;
using IdentityService.Entities;
using IdentityService.Features.Tenancy.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Tenant.Domain;
using Tenant.Domain.Data;
using Tenant.Domain.Entities;
using Xunit;

namespace IdentityService.Integration.Tests.Features.Tenancy;

/// <summary>
/// CRITICAL BUSINESS LOGIC TESTS
/// Verifies that users cannot access data from restaurants they don't belong to.
/// This is the core of multi-tenant security.
/// </summary>
[Collection("Database collection")]
public class TenancyIsolationTests : IAsyncLifetime
{
    private readonly TestDatabaseFixture _fixture;
    private IEmployeeService _employeeService = null!;
    private TenantDbContext _tenantDb = null!;

    public TenancyIsolationTests(TestDatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task ListEmployees_CanOnlyListEmployeesInOwnRestaurant()
    {
        // SCENARIO: Alice works at Restaurant A with 5 employees
        //           Bob works at Restaurant B with 3 employees
        //           Alice queries employees - should ONLY see her 5, not Bob's 3
        //
        // CRITICAL: This proves tenancy isolation works

        // Arrange
        var alice = new ApplicationUser { UserName = "alice@example.com", Email = "alice@example.com" };
        var bob = new ApplicationUser { UserName = "bob@example.com", Email = "bob@example.com" };
        var restaurantA = new Restaurant { Name = "Restaurant A" };
        var restaurantB = new Restaurant { Name = "Restaurant B" };

        // 5 employees in Restaurant A
        var employeesA = Enumerable.Range(1, 5)
            .Select(i => new ApplicationUser { UserName = $"empA{i}@example.com", Email = $"empA{i}@example.com" })
            .ToList();

        // 3 employees in Restaurant B
        var employeesB = Enumerable.Range(1, 3)
            .Select(i => new ApplicationUser { UserName = $"empB{i}@example.com", Email = $"empB{i}@example.com" })
            .ToList();

        _fixture.DbContext.Users.AddRange(new[] { alice, bob }.Concat(employeesA).Concat(employeesB));
        await _fixture.DbContext.SaveChangesAsync();

        _tenantDb.Restaurants.AddRange(restaurantA, restaurantB);

        // Make alice and bob admins of their respective restaurants
        _tenantDb.RestaurantUserRoles.AddRange(
            new RestaurantUserRole { UserId = alice.Id, RestaurantId = restaurantA.Id, RoleName = TenantRoles.TenantAdmin },
            new RestaurantUserRole { UserId = bob.Id, RestaurantId = restaurantB.Id, RoleName = TenantRoles.TenantAdmin }
        );

        // Add memberships
        _tenantDb.RestaurantMemberships.Add(new RestaurantMembership { UserId = alice.Id, RestaurantId = restaurantA.Id });
        foreach (var emp in employeesA)
            _tenantDb.RestaurantMemberships.Add(new RestaurantMembership { UserId = emp.Id, RestaurantId = restaurantA.Id });

        _tenantDb.RestaurantMemberships.Add(new RestaurantMembership { UserId = bob.Id, RestaurantId = restaurantB.Id });
        foreach (var emp in employeesB)
            _tenantDb.RestaurantMemberships.Add(new RestaurantMembership { UserId = emp.Id, RestaurantId = restaurantB.Id });

        await _tenantDb.SaveChangesAsync();

        // Act - Alice lists employees in her restaurant
        var result = await _employeeService.ListEmployeesAsync(alice.Id, restaurantA.Id, null, null, 1, 25, default);

        // Assert - CRITICAL: Should only see 5 employees from Restaurant A
        Assert.Equal(5, result.Items.Count);
        Assert.All(result.Items, emp =>
            Assert.NotEmpty(employeesA.Where(e => e.Id == emp.UserId))
        );

        // CRITICAL: Should NOT see any employees from Restaurant B
        Assert.Empty(result.Items.Where(emp =>
            employeesB.Any(e => e.Id == emp.UserId)
        ));
    }

    [Fact]
    public async Task GetEmployee_CannotAccessEmployeeFromDifferentRestaurant()
    {
        // SCENARIO: Alice tries to view employee from Restaurant B
        //           Should get error - tenancy breach!

        var alice = new ApplicationUser { UserName = "alice@example.com", Email = "alice@example.com" };
        var bob = new ApplicationUser { UserName = "bob@example.com", Email = "bob@example.com" };
        var bobsEmployee = new ApplicationUser { UserName = "bobsemp@example.com", Email = "bobsemp@example.com" };
        var restaurantA = new Restaurant { Name = "Restaurant A" };
        var restaurantB = new Restaurant { Name = "Restaurant B" };

        _fixture.DbContext.Users.AddRange(alice, bob, bobsEmployee);
        await _fixture.DbContext.SaveChangesAsync();

        _tenantDb.Restaurants.AddRange(restaurantA, restaurantB);

        _tenantDb.RestaurantUserRoles.AddRange(
            new RestaurantUserRole { UserId = alice.Id, RestaurantId = restaurantA.Id, RoleName = TenantRoles.TenantAdmin },
            new RestaurantUserRole { UserId = bob.Id, RestaurantId = restaurantB.Id, RoleName = TenantRoles.TenantAdmin }
        );

        _tenantDb.RestaurantMemberships.AddRange(
            new RestaurantMembership { UserId = alice.Id, RestaurantId = restaurantA.Id },
            new RestaurantMembership { UserId = bob.Id, RestaurantId = restaurantB.Id },
            new RestaurantMembership { UserId = bobsEmployee.Id, RestaurantId = restaurantB.Id }
        );

        await _tenantDb.SaveChangesAsync();

        // Act & Assert - Alice tries to get employee from Bob's restaurant
        // Should fail - this is a security boundary
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _employeeService.GetEmployeeAsync(alice.Id, restaurantB.Id, bobsEmployee.Id, default)
        );
        Assert.Contains("admin", ex.Message.ToLower());
    }

    [Fact]
    public async Task ListEmployees_NonAdminCannotListOthersEmployees()
    {
        // SCENARIO: Regular employee tries to list all employees in restaurant
        //           Should fail - only admins can

        var employee = new ApplicationUser { UserName = "emp@example.com", Email = "emp@example.com" };
        var restaurant = new Restaurant { Name = "Restaurant A" };

        _fixture.DbContext.Users.Add(employee);
        await _fixture.DbContext.SaveChangesAsync();

        _tenantDb.Restaurants.Add(restaurant);

        // Employee has "Server" role, NOT admin
        _tenantDb.RestaurantUserRoles.Add(
            new RestaurantUserRole { UserId = employee.Id, RestaurantId = restaurant.Id, RoleName = TenantRoles.TenantServer }
        );
        _tenantDb.RestaurantMemberships.Add(
            new RestaurantMembership { UserId = employee.Id, RestaurantId = restaurant.Id }
        );

        await _tenantDb.SaveChangesAsync();

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _employeeService.ListEmployeesAsync(employee.Id, restaurant.Id, null, null, 1, 25, default)
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

        var userRepository = new IdentityService.Features.Identity.Repositories.UserRepository(
            _fixture.DbContext,
            NullLogger<IdentityService.Features.Identity.Repositories.UserRepository>.Instance
        );

        _employeeService = new EmployeeService(
            new IdentityService.Features.Tenancy.Repositories.EmployeeRepository(_tenantDb),
            userRepository,
            NullLogger<EmployeeService>.Instance
        );
    }

    public Task DisposeAsync() => _fixture.DisposeAsync();
}
