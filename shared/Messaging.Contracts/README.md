# Messaging.Contracts

Shared MassTransit message contracts for Restaurant POS services — immutable record types for menu, inventory, order, and payment events. Every service that publishes or consumes one of these references this package, so all services share the same event shapes.

## Installation

```xml
<ItemGroup>
  <PackageReference Include="Messaging.Contracts" Version="1.0.*" />
</ItemGroup>
```

Or as a project reference for local development:

```xml
<ItemGroup>
  <ProjectReference Include="..\..\..\shared\messaging.contracts\Messaging.Contracts.csproj" />
</ItemGroup>
```

## Namespaces & Events

| Namespace | Events |
|---|---|
| `Messaging.Contracts.Events.Menu` | `MenuItemCreated`, `MenuItemUpdated`, `MenuItemDeleted` |
| `Messaging.Contracts.Events.Inventory` | `InventoryItemDepleted`, `InventoryItemRestocked`, `InventoryItemUpdated`, `ReserveInventory`, `ReleaseInventory`, `InventoryReserved`, `InventoryReserveFaulted` |
| `Messaging.Contracts.Events.Order` | `OrderSubmitted`, `OrderItemMessage` |
| `Messaging.Contracts.Events.Payment` | `PaymentRequested`, `PaymentSessionCreated`, `PaymentSucceeded`, `PaymentFailed` |

All are C# records, serialized with MassTransit's default serializer.

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

## Publishing

`.github/workflows/publish-messaging-contracts.yml` packs and pushes on any push to `dev` or `main` that touches `shared/Messaging.Contracts/**` (also triggerable manually via `gh workflow run publish-messaging-contracts.yml`). **It does not bump the version for you** — `--skip-duplicate` means pushing without bumping `<Version>` in the `.csproj` first just silently no-ops rather than publishing. Bump it yourself before you push.

Local dry run, no publish:
```bash
dotnet pack shared/Messaging.Contracts/Messaging.Contracts.csproj -c Release -p:PackageVersion=1.0.1 -o ./packages
```

## Versioning

- **Patch** (1.0.x): Bug fixes, documentation updates
- **Minor** (1.x.0): Backward‑compatible changes (adding optional fields)
- **Major** (x.0.0): Breaking changes (renaming/removing fields) - will be called out in release notes

## Adding a new event
1. Use an immutable record type
2. Include relevant tenant context (`restaurantId`, `locationId`) where applicable
3. Use descriptive, self-documenting property names
4. Consider backward compatibility when modifying an existing contract
5. Remove it if nothing consumes it — an unreferenced contract here is a signal something was deleted downstream without cleanup here

Namespaces live under `Messaging.Contracts.Events.*`.
