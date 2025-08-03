namespace InventoryService.Exceptions;

public class InsufficientInventoryException : Exception
{
    public Guid MenuItemId { get; }
    public int Requested { get; }
    public int Available { get; }
    
    public InsufficientInventoryException(Guid itemId, int requested, int available)
        : base($"Insufficient quantity for item '{itemId}': Requested={requested}, Available={available}")
    {
        MenuItemId = itemId;
        Requested = requested;
        Available = available;
    }
}