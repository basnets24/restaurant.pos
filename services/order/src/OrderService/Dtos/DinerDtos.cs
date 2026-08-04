namespace OrderService.Dtos;

/// <summary>
/// A diner's whole cart, submitted in one shot. The diner cart lives in the browser until
/// checkout, so there is no incremental server-side cart to check out by id.
///
/// Note what is absent: no prices, no item names, no restaurant/location. Prices and names are
/// resolved server-side; tenancy comes from the <c>X-Restaurant-Id</c>/<c>X-Location-Id</c>
/// headers like every other request, not from the body.
/// </summary>
/// <param name="CartId">Client-generated, stable for the life of the browser cart. Doubles as
/// the cart id and therefore as the order's idempotency key, so a double-tapped Place Order
/// button returns the same order instead of firing the kitchen twice.</param>
/// <param name="PickupTime">When the diner wants to collect. Null means as soon as possible.</param>
public record DinerCheckoutDto(
    Guid CartId,
    DateTimeOffset? PickupTime,
    List<DinerCheckoutLineDto> Items
);

/// <param name="OptionIds">Chosen modifier option ids only. The server looks up the name and
/// price of each - a client that could send its own PriceDelta could send a negative one.</param>
public record DinerCheckoutLineDto(
    Guid MenuItemId,
    int Quantity,
    string? Notes,
    List<Guid> OptionIds
);

public record DinerCheckoutResultDto(Guid OrderId, decimal GrandTotal, string Status);
