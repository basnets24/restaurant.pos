namespace InventoryService.Exceptions;

public class UnknownItemException : Exception
{
    public Guid MenuItemId { get; }

    public UnknownItemException(Guid itemId)
        : base($"Menu Item with ID '{itemId}' was not found in inventory.")
    {
        MenuItemId = itemId;
    }
}