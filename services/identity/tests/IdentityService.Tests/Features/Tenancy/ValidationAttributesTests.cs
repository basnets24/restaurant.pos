using IdentityService.Features.Tenancy.Validation;
using Xunit;

namespace IdentityService.Tests.Features.Tenancy;

/// <summary>
/// Unit tests for custom validation attributes.
/// These are simple but important for data integrity.
/// </summary>
public class ValidationAttributesTests
{
    [Fact]
    public void ValidTimeZoneAttribute_WithValidTimeZone_ReturnsTrue()
    {
        // Arrange
        var validator = new ValidTimeZoneAttribute();
        var validTimeZones = new[] { "America/Chicago", "Europe/London", "Asia/Tokyo", "UTC" };

        // Act & Assert
        foreach (var tz in validTimeZones)
        {
            Assert.True(validator.IsValid(tz));
        }
    }

    [Fact]
    public void ValidTimeZoneAttribute_WithInvalidTimeZone_ReturnsFalse()
    {
        // Arrange
        var validator = new ValidTimeZoneAttribute();
        var invalidTimeZones = new[] { "Not/ATimeZone", "America/InvalidCity", "GMT+5" };

        // Act & Assert
        foreach (var tz in invalidTimeZones)
        {
            Assert.False(validator.IsValid(tz));
        }
    }

    [Fact]
    public void ValidTimeZoneAttribute_WithNull_ReturnsTrue()
    {
        // Null is valid for optional fields
        var validator = new ValidTimeZoneAttribute();
        Assert.True(validator.IsValid(null));
    }

    [Fact]
    public void ValidTimeZoneAttribute_WithEmptyString_ReturnsTrue()
    {
        // Empty string is valid for optional fields
        var validator = new ValidTimeZoneAttribute();
        Assert.True(validator.IsValid(""));
    }

    [Fact]
    public void SafeNameAttribute_BlocksSQLInjectionPatterns()
    {
        // SECURITY TEST: Ensure dangerous patterns are blocked
        var validator = new SafeNameAttribute();
        var dangerousInputs = new[]
        {
            "'; DROP TABLE Restaurants; --",
            "<script>alert('xss')</script>",
            "Main' OR '1'='1",
            "Restaurant\"; DELETE FROM Locations; --",
            "onclick='malicious()'",
            "UNION SELECT * FROM Users",
            "exec sp_executesql",
            "Main<!-- comment -->",
            "Restaurant<img src=x onerror=alert()>"
        };

        // Act & Assert
        foreach (var input in dangerousInputs)
        {
            Assert.False(
                validator.IsValid(input),
                $"SafeNameAttribute should reject: {input}"
            );
        }
    }

    [Fact]
    public void SafeNameAttribute_AllowsNormalBusinessText()
    {
        // Normal names should pass
        var validator = new SafeNameAttribute();
        var validInputs = new[]
        {
            "Main Location",
            "Downtown - Branch 1",
            "Office (Headquarters)",
            "Restaurant & Lounge",
            "Joe's Deli",
            "The-Burger-Place",
            "Location 123"
        };

        // Act & Assert
        foreach (var input in validInputs)
        {
            Assert.True(
                validator.IsValid(input),
                $"SafeNameAttribute should allow: {input}"
            );
        }
    }

    [Fact]
    public void SafeNameAttribute_WithNull_ReturnsTrue()
    {
        var validator = new SafeNameAttribute();
        Assert.True(validator.IsValid(null));
    }

    [Fact]
    public void ReasonableLengthAttribute_BlocksExcessiveLength()
    {
        // Test DoS prevention - extremely long strings should be rejected
        var validator = new ReasonableLengthAttribute(maxLength: 1000);
        var tooLongString = new string('a', 1001);

        Assert.False(validator.IsValid(tooLongString));
    }

    [Fact]
    public void ReasonableLengthAttribute_AllowsReasonableLength()
    {
        var validator = new ReasonableLengthAttribute(maxLength: 1000);
        var reasonableString = new string('a', 500);

        Assert.True(validator.IsValid(reasonableString));
    }

    [Fact]
    public void ReasonableLengthAttribute_WithNull_ReturnsTrue()
    {
        var validator = new ReasonableLengthAttribute(maxLength: 1000);
        Assert.True(validator.IsValid(null));
    }
}
