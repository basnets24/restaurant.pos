using Common.Library.PostgreSQL;
using MassTransit;
using Messaging.Contracts.Events.Order;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OrderService.StateMachines;

namespace OrderService.Data;

public class OrderStateMap : SagaClassMap<OrderState>
{
    protected override void Configure(EntityTypeBuilder<OrderState> entity, ModelBuilder model)
    {
        entity.ToTable("OrderStates");
        entity.Property(x => x.CurrentState).HasMaxLength(64);
        entity.Property(x => x.Items)
            .HasConversion(JsonConverters.ListConverter<OrderItemMessage>())
            .Metadata.SetValueComparer(JsonConverters.ListComparer<OrderItemMessage>());
        entity.Property(x => x.Items).HasColumnType("jsonb");
        // Operational query aid only - OrderState isn't tenant-query-filtered
        // (nothing queries it outside MassTransit's own CorrelationId correlation).
        entity.HasIndex(x => new { x.RestaurantId, x.LocationId });
    }
}
