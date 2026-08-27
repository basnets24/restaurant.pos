namespace OrderService.Interfaces;

/// <summary>Reads the authenticated caller's identity from the current HTTP request's claims.</summary>
public interface ICurrentUserAccessor
{
    Guid UserId { get; }
    string DisplayName { get; }
}
