# Messaging.Contracts

Shared message contracts for Restaurant POS services using MassTransit. Provides immutable record types for menu, inventory, order, payment, and saga orchestration events. Publishing these contracts as a package ensures all services share the same event shapes and maintains consistency across the microservices architecture.

This library is consumed by all services in the Restaurant POS system and can be published as a package for external reuse.

## Installation

From GitHub Packages:

1) Add your GitHub NuGet source and credentials to `NuGet.config` or via CLI.
2) Reference the package in your `.csproj`:

```xml
<ItemGroup>
  <PackageReference Include="Messaging.Contracts" Version="1.0.*" />
</ItemGroup>
```

Or reference directly as a project (for development):

```xml
<ItemGroup>
  <ProjectReference Include="..\\..\\..\\shared\\Messaging.Contracts\\Messaging.Contracts.csproj" />
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

## Creating a Package

Tag-driven publish (CI):

```bash
git tag messaging.contracts-v1.0.1
git push origin messaging.contracts-v1.0.1
```

Local dry run pack:

```bash
dotnet pack shared/messaging.contracts/Messaging.Contracts.csproj -c Release -p:PackageVersion=1.0.1 -o ./packages
```

## Versioning

- **Patch** (1.0.x): Bug fixes, documentation updates
- **Minor** (1.x.0): Backward‑compatible changes (adding optional fields)
- **Major** (x.0.0): Breaking changes (renaming/removing fields) - will be called out in release notes

## Development Notes

All event types are C# records intended to be serialized by MassTransit's default serializer. When adding new events:

1. Use immutable record types
2. Include relevant tenant context (restaurantId, locationId) where applicable
3. Use descriptive property names that are self-documenting
4. Consider backward compatibility when modifying existing contracts

Namespaces live under `Messaging.Contracts.Events.*`.
