namespace OrderService.Entities;

/// <summary>
/// A modifier option chosen for one cart/order line, snapshotted at the moment it was chosen.
///
/// This follows the same rule as <c>MenuItemName</c>/<c>UnitPrice</c>: it is a copy, not a
/// reference. Catalog owns modifier groups and may rename an option or reprice it tomorrow;
/// a printed ticket and a settled bill must still say what the guest actually ordered and was
/// actually charged. <c>OptionId</c> is kept only so a line can be traced back to the catalog
/// row - nothing reads through it to fetch a current price.
/// </summary>
public record SelectedModifier(
    Guid GroupId,
    string GroupName,
    Guid OptionId,
    string OptionName,
    decimal PriceDelta
);
