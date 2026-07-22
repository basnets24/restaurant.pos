namespace OrderService.Exceptions;

/// <summary>
/// The request is well-formed but conflicts with the resource's current state
/// (e.g. a table already occupied, a stale optimistic-concurrency version).
/// Mapped to 409 Conflict by GlobalExceptionMiddleware, by type - not message content.
/// </summary>
public class ConflictException : Exception
{
    public ConflictException(string message) : base(message) { }
}

/// <summary>
/// The request violates a business rule even though the referenced resources exist
/// (e.g. insufficient stock, an unavailable menu item, an empty cart at checkout).
/// Mapped to 400 Bad Request by GlobalExceptionMiddleware, by type - not message content.
/// </summary>
public class BusinessRuleException : Exception
{
    public BusinessRuleException(string message) : base(message) { }
}
