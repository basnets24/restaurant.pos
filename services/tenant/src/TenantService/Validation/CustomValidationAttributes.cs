using System.ComponentModel.DataAnnotations;

namespace TenantService.Validation;

/// <summary>
/// Validates that a time zone ID is valid (if provided)
/// </summary>
public class ValidTimeZoneAttribute : ValidationAttribute
{
    public override bool IsValid(object? value)
    {
        if (value == null || string.IsNullOrWhiteSpace(value.ToString()))
            return true; // Null/empty is valid for optional fields

        var timeZoneId = value.ToString()!;

        try
        {
            TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            return true;
        }
        catch (TimeZoneNotFoundException)
        {
            return false;
        }
        catch (InvalidTimeZoneException)
        {
            return false;
        }
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field contains an invalid time zone identifier.";
    }
}

/// <summary>
/// Validates that a restaurant/location name doesn't contain SQL injection patterns
/// </summary>
public class SafeNameAttribute : ValidationAttribute
{
    private static readonly string[] ForbiddenPatterns = {
        "select", "insert", "update", "delete", "drop", "create", "alter",
        "exec", "execute", "sp_", "xp_", "union", "script", "javascript",
        "<script", "</script", "onclick", "onerror", "onload"
    };

    public override bool IsValid(object? value)
    {
        if (value == null)
            return true;

        var input = value.ToString()!.ToLowerInvariant();

        return !ForbiddenPatterns.Any(pattern => input.Contains(pattern));
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field contains potentially unsafe content.";
    }
}

/// <summary>
/// Validates that a string doesn't exceed a reasonable length to prevent DoS
/// </summary>
public class ReasonableLengthAttribute : ValidationAttribute
{
    private readonly int _maxLength;

    public ReasonableLengthAttribute(int maxLength = 1000)
    {
        _maxLength = maxLength;
    }

    public override bool IsValid(object? value)
    {
        if (value == null)
            return true;

        return value.ToString()!.Length <= _maxLength;
    }

    public override string FormatErrorMessage(string name)
    {
        return $"The {name} field exceeds the maximum allowed length of {_maxLength} characters.";
    }
}