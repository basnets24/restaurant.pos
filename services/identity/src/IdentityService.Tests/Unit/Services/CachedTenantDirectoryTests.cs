using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using IdentityService.Services;
using Xunit;

namespace IdentityService.Tests.Unit.Services;

public class CachedTenantDirectoryTests
{
    private readonly Mock<ITenantDirectory> _mockInnerDirectory;
    private readonly IMemoryCache _cache;
    private readonly Mock<ILogger<CachedTenantDirectory>> _mockLogger;
    private readonly CachedTenantDirectory _cachedDirectory;

    public CachedTenantDirectoryTests()
    {
        _mockInnerDirectory = new Mock<ITenantDirectory>();
        _cache = new MemoryCache(new MemoryCacheOptions());
        _mockLogger = new Mock<ILogger<CachedTenantDirectory>>();
        _cachedDirectory = new CachedTenantDirectory(_mockInnerDirectory.Object, _cache, _mockLogger.Object);
    }

    [Fact]
    public async Task GetPrimaryMembershipAsync_CachesMembershipResult()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var expectedResult = new TenantMembershipResult("rest123", "loc456", DateTime.UtcNow);
        
        _mockInnerDirectory
            .Setup(x => x.GetPrimaryMembershipAsync(userId, default))
            .ReturnsAsync(expectedResult);

        // Act - First call should hit the inner directory
        var result1 = await _cachedDirectory.GetPrimaryMembershipAsync(userId);
        var result2 = await _cachedDirectory.GetPrimaryMembershipAsync(userId);

        // Assert
        Assert.Equal(expectedResult, result1);
        Assert.Equal(expectedResult, result2);
        
        // Verify inner directory was only called once (second call came from cache)
        _mockInnerDirectory.Verify(x => x.GetPrimaryMembershipAsync(userId, default), Times.Once);
    }

    [Fact]
    public async Task GetPrimaryMembershipAsync_CachesNullResults()
    {
        // Arrange
        var userId = Guid.NewGuid();
        
        _mockInnerDirectory
            .Setup(x => x.GetPrimaryMembershipAsync(userId, default))
            .ReturnsAsync((TenantMembershipResult?)null);

        // Act - First call should hit the inner directory
        var result1 = await _cachedDirectory.GetPrimaryMembershipAsync(userId);
        var result2 = await _cachedDirectory.GetPrimaryMembershipAsync(userId);

        // Assert
        Assert.Null(result1);
        Assert.Null(result2);
        
        // Verify inner directory was only called once (second call came from cache)
        _mockInnerDirectory.Verify(x => x.GetPrimaryMembershipAsync(userId, default), Times.Once);
    }

    [Fact]
    public async Task GetDefaultLocationAsync_CachesLocationResults()
    {
        // Arrange
        var restaurantId = "rest123";
        var preferredLocationId = "loc456";
        var expectedResult = "loc789";
        
        _mockInnerDirectory
            .Setup(x => x.GetDefaultLocationAsync(restaurantId, preferredLocationId, default))
            .ReturnsAsync(expectedResult);

        // Act - First call should hit the inner directory
        var result1 = await _cachedDirectory.GetDefaultLocationAsync(restaurantId, preferredLocationId);
        var result2 = await _cachedDirectory.GetDefaultLocationAsync(restaurantId, preferredLocationId);

        // Assert
        Assert.Equal(expectedResult, result1);
        Assert.Equal(expectedResult, result2);
        
        // Verify inner directory was only called once
        _mockInnerDirectory.Verify(x => x.GetDefaultLocationAsync(restaurantId, preferredLocationId, default), Times.Once);
    }

    [Fact]
    public async Task GetUserRolesAsync_CachesRoleResults()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var restaurantId = "rest123";
        var expectedRoles = new List<string> { "Manager", "Server" }.AsReadOnly();
        
        _mockInnerDirectory
            .Setup(x => x.GetUserRolesAsync(userId, restaurantId, default))
            .ReturnsAsync(expectedRoles);

        // Act - First call should hit the inner directory
        var result1 = await _cachedDirectory.GetUserRolesAsync(userId, restaurantId);
        var result2 = await _cachedDirectory.GetUserRolesAsync(userId, restaurantId);

        // Assert
        Assert.Equal(expectedRoles, result1);
        Assert.Equal(expectedRoles, result2);
        
        // Verify inner directory was only called once
        _mockInnerDirectory.Verify(x => x.GetUserRolesAsync(userId, restaurantId, default), Times.Once);
    }

    [Fact]
    public async Task GetUserRolesAsync_DifferentCacheKeysForDifferentUsers()
    {
        // Arrange
        var userId1 = Guid.NewGuid();
        var userId2 = Guid.NewGuid();
        var restaurantId = "rest123";
        var roles1 = new List<string> { "Manager" }.AsReadOnly();
        var roles2 = new List<string> { "Server" }.AsReadOnly();
        
        _mockInnerDirectory
            .Setup(x => x.GetUserRolesAsync(userId1, restaurantId, default))
            .ReturnsAsync(roles1);
        _mockInnerDirectory
            .Setup(x => x.GetUserRolesAsync(userId2, restaurantId, default))
            .ReturnsAsync(roles2);

        // Act
        var result1 = await _cachedDirectory.GetUserRolesAsync(userId1, restaurantId);
        var result2 = await _cachedDirectory.GetUserRolesAsync(userId2, restaurantId);

        // Assert
        Assert.Equal(roles1, result1);
        Assert.Equal(roles2, result2);
        
        // Verify each user required separate directory call
        _mockInnerDirectory.Verify(x => x.GetUserRolesAsync(userId1, restaurantId, default), Times.Once);
        _mockInnerDirectory.Verify(x => x.GetUserRolesAsync(userId2, restaurantId, default), Times.Once);
    }
}