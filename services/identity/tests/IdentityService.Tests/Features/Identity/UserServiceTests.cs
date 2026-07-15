using System.Threading.Tasks;
using IdentityService.Entities;
using IdentityService.Features.Identity.DTOs;
using IdentityService.Features.Identity.Repositories;
using IdentityService.Features.Identity.Services;
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
    private readonly Mock<ILogger<UserService>> _mockLogger;
    private readonly UserService _service;

    public UserServiceTests()
    {
        _mockRepository = new Mock<IUserRepository>();
        _mockLogger = new Mock<ILogger<UserService>>();
        _service = new UserService(_mockRepository.Object, _mockLogger.Object);
    }

    [Fact]
    public async Task GetMeAsync_WithValidUserId_ReturnsUserDto()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = new ApplicationUser
        {
            Id = userId,
            Email = "test@example.com",
            UserName = "testuser",
            DisplayName = "Test User"
        };

        _mockRepository.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        // Act
        var result = await _service.GetMeAsync(userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(userId, result.Id);
        Assert.Equal("test@example.com", result.Email);
        Assert.Equal("testuser", result.UserName);

        _mockRepository.Verify(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetMeAsync_WithInvalidUserId_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockRepository.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((ApplicationUser?)null);

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.GetMeAsync(userId)
        );
    }

    [Fact]
    public async Task GetByIdAsync_UserNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockRepository.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((ApplicationUser?)null);

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _service.GetByIdAsync(userId)
        );
    }

    [Fact]
    public async Task GetByIdAsync_UserExists_ReturnsUserDetailDto()
    {
        // Arrange
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

        _mockRepository.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        // Act
        var result = await _service.GetByIdAsync(userId);

        // Assert
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
        // Arrange
        var users = new[]
        {
            new ApplicationUser { Id = Guid.NewGuid(), UserName = "alice", Email = "alice@example.com" },
            new ApplicationUser { Id = Guid.NewGuid(), UserName = "bob", Email = "bob@example.com" },
            new ApplicationUser { Id = Guid.NewGuid(), UserName = "charlie", Email = "charlie@example.com" }
        };

        var query = new UsersQuery(Username: null, Role: null, Page: 1, PageSize: 25);

        _mockRepository.Setup(r => r.SearchPagedAsync(
            query.Username,
            query.Role,
            query.Page,
            query.PageSize,
            It.IsAny<CancellationToken>()
        )).ReturnsAsync(new IdentityService.Features.Shared.DTOs.Paged<UserListItemDto>(
            users.Select(u => new UserListItemDto(
                u.Id,
                u.Email,
                u.UserName,
                u.DisplayName,
                u.EmailConfirmed,
                false,
                new[] { "User" }
            )).ToList(),
            page: 1,
            pageSize: 25,
            total: 3
        ));

        // Act
        var result = await _service.ListUsersAsync(query);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(3, result.Items.Count);
        Assert.Equal(1, result.Page);
        Assert.Equal(3, result.Total);
    }

    [Fact]
    public async Task ListUsersAsync_FilterByRole_CallsRepositoryWithRole()
    {
        // Arrange
        var query = new UsersQuery(Username: null, Role: "Admin", Page: 1, PageSize: 25);

        _mockRepository.Setup(r => r.SearchPagedAsync(
            null,
            "Admin",
            1,
            25,
            It.IsAny<CancellationToken>()
        )).ReturnsAsync(new IdentityService.Features.Shared.DTOs.Paged<UserListItemDto>(
            new List<UserListItemDto>(),
            1,
            25,
            0
        ));

        // Act
        await _service.ListUsersAsync(query);

        // Assert - Verify repository was called with role filter
        _mockRepository.Verify(
            r => r.SearchPagedAsync(null, "Admin", 1, 25, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task ListUsersAsync_SearchByUsername_CallsRepositoryWithSearchTerm()
    {
        // Arrange
        var query = new UsersQuery(Username: "ali", Role: null, Page: 1, PageSize: 25);

        _mockRepository.Setup(r => r.SearchPagedAsync(
            "ali",
            null,
            1,
            25,
            It.IsAny<CancellationToken>()
        )).ReturnsAsync(new IdentityService.Features.Shared.DTOs.Paged<UserListItemDto>(
            new List<UserListItemDto>(),
            1,
            25,
            0
        ));

        // Act
        await _service.ListUsersAsync(query);

        // Assert - Verify repository was called with search term
        _mockRepository.Verify(
            r => r.SearchPagedAsync("ali", null, 1, 25, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }
}
