using System.Security.Claims;
using IdentityService.Entities;
using IdentityService.Features.Identity.DTOs;
using IdentityService.Features.Identity.Repositories;
using IdentityService.Features.Identity.Services;
using IdentityService.Features.Shared.DTOs;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace IdentityService.Tests.Features.Identity;

/// <summary>
/// Unit tests for UserService using mocked dependencies.
/// Tests business logic without needing a database.
/// </summary>
public class UserServiceTests
{
    private readonly Mock<IUserRepository> _mockRepository;
    private readonly Mock<UserManager<ApplicationUser>> _mockUserManager;
    private readonly Mock<RoleManager<ApplicationRole>> _mockRoleManager;
    private readonly Mock<ILogger<UserService>> _mockLogger;
    private readonly UserService _service;

    public UserServiceTests()
    {
        _mockRepository = new Mock<IUserRepository>();

        var userStore = new Mock<IUserStore<ApplicationUser>>();
        _mockUserManager = new Mock<UserManager<ApplicationUser>>(
            userStore.Object, null!, null!, null!, null!, null!, null!, null!, null!);

        var roleStore = new Mock<IRoleStore<ApplicationRole>>();
        _mockRoleManager = new Mock<RoleManager<ApplicationRole>>(
            roleStore.Object, null!, null!, null!, null!);

        _mockLogger = new Mock<ILogger<UserService>>();
        _service = new UserService(
            _mockRepository.Object,
            _mockUserManager.Object,
            _mockRoleManager.Object,
            _mockLogger.Object);
    }

    private static ClaimsPrincipal PrincipalFor(Guid userId) =>
        new(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) }));

    [Fact]
    public async Task GetMeAsync_WithValidUser_ReturnsUserDto()
    {
        var userId = Guid.NewGuid();
        var user = new ApplicationUser { Id = userId, Email = "test@example.com", UserName = "testuser", DisplayName = "Test User" };
        var principal = PrincipalFor(userId);

        _mockUserManager.Setup(m => m.GetUserAsync(principal)).ReturnsAsync(user);
        _mockUserManager.Setup(m => m.GetRolesAsync(user)).ReturnsAsync(new List<string> { "Admin" });

        var result = await _service.GetMeAsync(principal);

        Assert.NotNull(result);
        Assert.Equal(userId, result.Id);
        Assert.Equal("test@example.com", result.Email);
        Assert.Equal("testuser", result.UserName);
        Assert.Contains("Admin", result.Roles);
    }

    [Fact]
    public async Task GetMeAsync_UserNotFound_ReturnsNull()
    {
        var principal = PrincipalFor(Guid.NewGuid());
        _mockUserManager.Setup(m => m.GetUserAsync(principal)).ReturnsAsync((ApplicationUser?)null);

        var result = await _service.GetMeAsync(principal);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetByIdAsync_UserNotFound_ReturnsNull()
    {
        var userId = Guid.NewGuid();
        _mockRepository.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync((ApplicationUser?)null);

        var result = await _service.GetByIdAsync(userId);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetByIdAsync_UserExists_ReturnsUserDetailDto()
    {
        var userId = Guid.NewGuid();
        var user = new ApplicationUser
        {
            Id = userId,
            Email = "alice@example.com",
            UserName = "alice",
            DisplayName = "Alice",
            EmailConfirmed = true,
            LockoutEnabled = true,
            TwoFactorEnabled = false
        };

        _mockRepository.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(user);
        _mockUserManager.Setup(m => m.GetRolesAsync(user)).ReturnsAsync(new List<string>());

        var result = await _service.GetByIdAsync(userId);

        Assert.NotNull(result);
        Assert.Equal(userId, result.Id);
        Assert.Equal("alice@example.com", result.Email);
        Assert.True(result.EmailConfirmed);
        Assert.True(result.LockoutEnabled);
        Assert.False(result.TwoFactorEnabled);
    }

    [Fact]
    public async Task ListUsersAsync_WithQuery_ReturnsPagedResults()
    {
        var users = new List<ApplicationUser>
        {
            new() { Id = Guid.NewGuid(), UserName = "alice", Email = "alice@example.com" },
            new() { Id = Guid.NewGuid(), UserName = "bob", Email = "bob@example.com" },
            new() { Id = Guid.NewGuid(), UserName = "charlie", Email = "charlie@example.com" }
        };
        var query = new UsersQuery(Username: null, Role: null, Page: 1, PageSize: 25);

        _mockRepository
            .Setup(r => r.SearchPagedAsync(query.Username, query.Role, query.Page, query.PageSize, It.IsAny<CancellationToken>()))
            .ReturnsAsync((users, (long)users.Count));
        _mockUserManager
            .Setup(m => m.GetRolesAsync(It.IsAny<ApplicationUser>()))
            .ReturnsAsync(new List<string> { "User" });

        var result = await _service.ListUsersAsync(query);

        Assert.NotNull(result);
        Assert.Equal(3, result.Items.Count);
        Assert.Equal(1, result.Page);
        Assert.Equal(3, result.Total);
    }

    [Fact]
    public async Task ListUsersAsync_FilterByRole_CallsRepositoryWithRole()
    {
        var query = new UsersQuery(Username: null, Role: "Admin", Page: 1, PageSize: 25);

        _mockRepository
            .Setup(r => r.SearchPagedAsync(null, "Admin", 1, 25, It.IsAny<CancellationToken>()))
            .ReturnsAsync((new List<ApplicationUser>(), 0L));

        await _service.ListUsersAsync(query);

        _mockRepository.Verify(
            r => r.SearchPagedAsync(null, "Admin", 1, 25, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ListUsersAsync_SearchByUsername_CallsRepositoryWithSearchTerm()
    {
        var query = new UsersQuery(Username: "ali", Role: null, Page: 1, PageSize: 25);

        _mockRepository
            .Setup(r => r.SearchPagedAsync("ali", null, 1, 25, It.IsAny<CancellationToken>()))
            .ReturnsAsync((new List<ApplicationUser>(), 0L));

        await _service.ListUsersAsync(query);

        _mockRepository.Verify(
            r => r.SearchPagedAsync("ali", null, 1, 25, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task DisableAsync_UserNotFound_ThrowsKeyNotFoundException()
    {
        var userId = Guid.NewGuid();
        _mockRepository.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync((ApplicationUser?)null);

        await Assert.ThrowsAsync<KeyNotFoundException>(() => _service.DisableAsync(userId));
    }

    [Fact]
    public async Task DisableAsync_UserIsAdmin_ThrowsInvalidOperationException()
    {
        var userId = Guid.NewGuid();
        var user = new ApplicationUser { Id = userId, UserName = "admin" };

        _mockRepository.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(user);
        _mockUserManager.Setup(m => m.GetRolesAsync(user)).ReturnsAsync(new List<string> { "Admin" });

        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.DisableAsync(userId));
    }

    [Fact]
    public async Task DisableAsync_ValidNonAdminUser_LocksOutUser()
    {
        var userId = Guid.NewGuid();
        var user = new ApplicationUser { Id = userId, UserName = "regular" };

        _mockRepository.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(user);
        _mockUserManager.Setup(m => m.GetRolesAsync(user)).ReturnsAsync(new List<string> { "Server" });
        _mockUserManager.Setup(m => m.UpdateAsync(user)).ReturnsAsync(IdentityResult.Success);

        await _service.DisableAsync(userId);

        Assert.True(user.LockoutEnabled);
        _mockUserManager.Verify(m => m.UpdateAsync(user), Times.Once);
    }

    [Fact]
    public async Task AddRolesAsync_RoleDoesNotExist_ThrowsArgumentException()
    {
        var userId = Guid.NewGuid();
        var user = new ApplicationUser { Id = userId, UserName = "bob" };

        _mockRepository.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(user);
        _mockRoleManager.Setup(m => m.RoleExistsAsync("Ghost")).ReturnsAsync(false);

        await Assert.ThrowsAsync<ArgumentException>(
            () => _service.AddRolesAsync(userId, new AddRolesDto { Roles = new List<string> { "Ghost" } }));
    }

    [Fact]
    public async Task AddRolesAsync_ValidRoles_AddsToUser()
    {
        var userId = Guid.NewGuid();
        var user = new ApplicationUser { Id = userId, UserName = "bob" };

        _mockRepository.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(user);
        _mockRoleManager.Setup(m => m.RoleExistsAsync("Manager")).ReturnsAsync(true);
        _mockUserManager
            .Setup(m => m.AddToRolesAsync(user, It.Is<IEnumerable<string>>(r => r.Contains("Manager"))))
            .ReturnsAsync(IdentityResult.Success);

        await _service.AddRolesAsync(userId, new AddRolesDto { Roles = new List<string> { "Manager" } });

        _mockUserManager.Verify(
            m => m.AddToRolesAsync(user, It.Is<IEnumerable<string>>(r => r.Contains("Manager"))),
            Times.Once);
    }

    [Fact]
    public async Task RemoveRoleAsync_RoleDoesNotExist_ThrowsArgumentException()
    {
        var userId = Guid.NewGuid();
        var user = new ApplicationUser { Id = userId, UserName = "bob" };

        _mockRepository.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(user);
        _mockRoleManager.Setup(m => m.RoleExistsAsync("Ghost")).ReturnsAsync(false);

        await Assert.ThrowsAsync<ArgumentException>(() => _service.RemoveRoleAsync(userId, "Ghost"));
    }

    [Fact]
    public async Task GetAllRolesAsync_ReturnsOrderedRoleNames()
    {
        var roles = new List<ApplicationRole>
        {
            new() { Name = "Server" },
            new() { Name = "Admin" },
            new() { Name = "Manager" }
        }.AsQueryable();

        _mockRoleManager.Setup(m => m.Roles).Returns(roles);

        var result = await _service.GetAllRolesAsync();

        Assert.Equal(new[] { "Admin", "Manager", "Server" }, result);
    }
}
