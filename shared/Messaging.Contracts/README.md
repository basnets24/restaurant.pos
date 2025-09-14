# Messaging.Contracts

Shared message contracts for Restaurant POS services using MassTransit. Provides immutable record types for menu, inventory, order, payment, and saga orchestration events. Publishing these contracts as a package ensures all services share the same event shapes.

## Installation

Reference from your service or consume as a package:

```xml
<ItemGroup>
  <ProjectReference Include="..\\..\\..\\shared\\Messaging.Contracts\\Messaging.Contracts.csproj" />
</ItemGroup>
```

Or (when published):
```xml
<ItemGroup>
  <PackageReference Include="Messaging.Contracts" Version="1.0.*" />
</ItemGroup>
```

## Namespaces & Events

- Messaging.Contracts.Events.Menu
  - MenuItemCreated, MenuItemUpdated, MenuItemDeleted

- Messaging.Contracts.Events.Inventory
  - InventoryItemDepleted, InventoryItemRestocked, InventoryItemUpdated
  - ReserveInventory, ReleaseInventory, InventoryReserved, InventoryReserveFaulted

- Messaging.Contracts.Events.Order
  - OrderSubmitted, OrderItemMessage

- Messaging.Contracts.Events.Payment
  - PaymentRequested, PaymentSessionCreated, PaymentSucceeded, PaymentFailed

- Messaging.Contracts.Events.Sagas
  - PaymentTimeoutExpired

All event types are C# records intended to be serialized by MassTransit’s default serializer.

## Usage with MassTransit

Consumer example:
```csharp
using MassTransit;
using Messaging.Contracts.Events.Inventory;

public class InventoryItemUpdatedConsumer : IConsumer<InventoryItemUpdated>
{
    public Task Consume(ConsumeContext<InventoryItemUpdated> ctx)
    {
        var e = ctx.Message;
        // handle update
        return Task.CompletedTask;
    }
}
```

Publishing example:
```csharp
using MassTransit;
using Messaging.Contracts.Events.Payment;

await publishEndpoint.Publish(new PaymentRequested(
    correlationId: Guid.NewGuid(),
    orderId: order.Id,
    tableId: order.TableId,
    amountCents: (long)(order.Total * 100),
    restaurantId: tenant.RestaurantId!,
    locationId: tenant.LocationId!
));
```

## Versioning

- Backward‑compatible changes (adding optional fields) will bump the minor version.
- Breaking changes (renaming/removing fields) will bump the major version and be called out in release notes.

License: Proprietary (internal project).
