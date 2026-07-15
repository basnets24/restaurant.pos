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
/// CRITICAL BUSINESS LOGIC TEST
/// Proves roles assigned in one restaurant don't affect another.
/// Employee can have different roles in different restaurants.
/// </summary>
[Collection("Database collection")]
public class RoleAssignmentIsolationTests : IAsyncLifetime
{
    private readonly TestDatabaseFixture _fixture;
    private IEmployeeService _employeeService = null!;
    private TenantDbContext _tenantDb = null!;

    public RoleAssignmentIsolationTests(TestDatabaseFixture fixture)
    {
        _fixture = fixture;
    }

    [Fact]
    public async Task AddEmployeeRoles_RolesOnlyApplyToTargetRestaurant()
    {
        // SCENARIO: Employee works at TWO restaurants
        //           - Restaurant A: Has "Server" role
        //           - Restaurant B: Has "Admin" role
        //
        //           Adding "Chef" role in B should NOT affect roles in A
        //
        // CRITICAL: Proves role isolation across tenants

        var employee = new ApplicationUser { UserName = "emp@example.com", Email = "emp@example.com" };
        var admin = new ApplicationUser { UserName = "admin@example.com", Email = "admin@example.com" };
        var restaurantA = new Restaurant { Name = "Restaurant A" };
        var restaurantB = new Restaurant { Name = "Restaurant B" };

        _fixture.DbContext.Users.AddRange(employee, admin);
        await _fixture.DbContext.SaveChangesAsync();

        _tenantDb.Restaurants.AddRange(restaurantA, restaurantB);

        // Admin in both restaurants
        _tenantDb.RestaurantUserRoles.AddRange(
            new RestaurantUserRole { UserId = admin.Id, RestaurantId = restaurantA.Id, RoleName = TenantRoles.TenantAdmin },
            new RestaurantUserRole { UserId = admin.Id, RestaurantId = restaurantB.Id, RoleName = TenantRoles.TenantAdmin }
        );

        // Employee is "Server" in A, "Admin" in B
        _tenantDb.RestaurantUserRoles.AddRange(
            new RestaurantUserRole { UserId = employee.Id, RestaurantId = restaurantA.Id, RoleName = TenantRoles.TenantServer },
            new RestaurantUserRole { UserId = employee.Id, RestaurantId = restaurantB.Id, RoleName = TenantRoles.TenantAdmin }
        );

        _tenantDb.RestaurantMemberships.AddRange(
            new RestaurantMembership { UserId = employee.Id, RestaurantId = restaurantA.Id },
            new RestaurantMembership { UserId = employee.Id, RestaurantId = restaurantB.Id },
            new RestaurantMembership { UserId = admin.Id, RestaurantId = restaurantA.Id },
            new RestaurantMembership { UserId = admin.Id, RestaurantId = restaurantB.Id }
        );

        await _tenantDb.SaveChangesAsync();

        // Act - Add "Chef" role in Restaurant B only
        var dto = new EmployeeRoleUpdateDto(new[] { TenantRoles.TenantChef });
        await _employeeService.AddEmployeeRolesAsync(admin.Id, restaurantB.Id, employee.Id, dto, default);

        // Assert - Verify roles in each restaurant independently
        var rolesInA = await _employeeService.GetEmployeeRolesAsync(admin.Id, restaurantA.Id, employee.Id, default);
        var rolesInB = await _employeeService.GetEmployeeRolesAsync(admin.Id, restaurantB.Id, employee.Id, default);

        // Restaurant A: Still only "Server" - NOT affected by B changes
        Assert.Contains(TenantRoles.TenantServer, rolesInA);
        Assert.Single(rolesInA); // Only Server
        Assert.DoesNotContain(TenantRoles.TenantChef, rolesInA);

        // Restaurant B: Has both "Admin" and "Chef"
        Assert.Contains(TenantRoles.TenantAdmin, rolesInB);
        Assert.Contains(TenantRoles.TenantChef, rolesInB);
        Assert.Equal(2, rolesInB.Count);
    }

    [Fact]
    public async Task RemoveRole_OnlyAffectsTargetRestaurant()
    {
        // SCENARIO: Employee has multiple roles in both restaurants
        //           Remove "Server" from A
        //           B's roles should be untouched

        var employee = new ApplicationUser { UserName = "emp@example.com", Email = "emp@example.com" };
        var admin = new ApplicationUser { UserName = "admin@example.com", Email = "admin@example.com" };
        var restaurantA = new Restaurant { Name = "Restaurant A" };
        var restaurantB = new Restaurant { Name = "Restaurant B" };

        _fixture.DbContext.Users.AddRange(employee, admin);
        await _fixture.DbContext.SaveChangesAsync();

        _tenantDb.Restaurants.AddRange(restaurantA, restaurantB);

        // Both are admins
        _tenantDb.RestaurantUserRoles.AddRange(
            new RestaurantUserRole { UserId = admin.Id, RestaurantId = restaurantA.Id, RoleName = TenantRoles.TenantAdmin },
            new RestaurantUserRole { UserId = admin.Id, RestaurantId = restaurantB.Id, RoleName = TenantRoles.TenantAdmin }
        );

        // Employee has roles in both
        _tenantDb.RestaurantUserRoles.AddRange(
            new RestaurantUserRole { UserId = employee.Id, RestaurantId = restaurantA.Id, RoleName = TenantRoles.TenantServer },
            new RestaurantUserRole { UserId = employee.Id, RestaurantId = restaurantA.Id, RoleName = TenantRoles.TenantChef },
            new RestaurantUserRole { UserId = employee.Id, RestaurantId = restaurantB.Id, RoleName = TenantRoles.TenantServer },
            new RestaurantUserRole { UserId = employee.Id, RestaurantId = restaurantB.Id, RoleName = TenantRoles.TenantChef }
        );

        _tenantDb.RestaurantMemberships.AddRange(
            new RestaurantMembership { UserId = employee.Id, RestaurantId = restaurantA.Id },
            new RestaurantMembership { UserId = employee.Id, RestaurantId = restaurantB.Id },
            new RestaurantMembership { UserId = admin.Id, RestaurantId = restaurantA.Id },
            new RestaurantMembership { UserId = admin.Id, RestaurantId = restaurantB.Id }
        );

        await _tenantDb.SaveChangesAsync();

        // Act - Remove "Server" from Restaurant A only
        await _employeeService.RemoveEmployeeRoleAsync(admin.Id, restaurantA.Id, employee.Id, TenantRoles.TenantServer, default);

        // Assert
        var rolesInA = await _employeeService.GetEmployeeRolesAsync(admin.Id, restaurantA.Id, employee.Id, default);
        var rolesInB = await _employeeService.GetEmployeeRolesAsync(admin.Id, restaurantB.Id, employee.Id, default);

        // Restaurant A: Only "Chef" now
        Assert.Single(rolesInA);
        Assert.Contains(TenantRoles.TenantChef, rolesInA);
        Assert.DoesNotContain(TenantRoles.TenantServer, rolesInA);

        // Restaurant B: Untouched - still has both
        Assert.Equal(2, rolesInB.Count);
        Assert.Contains(TenantRoles.TenantServer, rolesInB);
        Assert.Contains(TenantRoles.TenantChef, rolesInB);
    }

    [Fact]
    public async Task AdminCannotEscalatePrivileges_ToAdminInDifferentRestaurant()
    {
        // SCENARIO: Alice is admin of A, member of B
        //           Alice tries to make herself admin of B
        //           System should prevent this - only admin of B can do this

        var alice = new ApplicationUser { UserName = "alice@example.com", Email = "alice@example.com" };
        var bobAdmin = new ApplicationUser { UserName = "bob@example.com", Email = "bob@example.com" };
        var restaurantA = new Restaurant { Name = "Restaurant A" };
        var restaurantB = new Restaurant { Name = "Restaurant B" };

        _fixture.DbContext.Users.AddRange(alice, bobAdmin);
        await _fixture.DbContext.SaveChangesAsync();

        _tenantDb.Restaurants.AddRange(restaurantA, restaurantB);

        // Alice is admin of A
        _tenantDb.RestaurantUserRoles.Add(
            new RestaurantUserRole { UserId = alice.Id, RestaurantId = restaurantA.Id, RoleName = TenantRoles.TenantAdmin }
        );

        // Bob is admin of B
        _tenantDb.RestaurantUserRoles.Add(
            new RestaurantUserRole { UserId = bobAdmin.Id, RestaurantId = restaurantB.Id, RoleName = TenantRoles.TenantAdmin }
        );

        // Alice and Bob are both members of both restaurants (but with different roles)
        _tenantDb.RestaurantMemberships.AddRange(
            new RestaurantMembership { UserId = alice.Id, RestaurantId = restaurantA.Id },
            new RestaurantMembership { UserId = alice.Id, RestaurantId = restaurantB.Id },
            new RestaurantMembership { UserId = bobAdmin.Id, RestaurantId = restaurantA.Id },
            new RestaurantMembership { UserId = bobAdmin.Id, RestaurantId = restaurantB.Id }
        );

        await _tenantDb.SaveChangesAsync();

        // Act & Assert - Alice (not admin of B) tries to add herself as admin of B
        var dto = new EmployeeRoleUpdateDto(new[] { TenantRoles.TenantAdmin });
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => _employeeService.AddEmployeeRolesAsync(alice.Id, restaurantB.Id, alice.Id, dto, default)
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
