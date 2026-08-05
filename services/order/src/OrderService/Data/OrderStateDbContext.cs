using MassTransit.EntityFrameworkCoreIntegration;
using Microsoft.EntityFrameworkCore;
using OrderService.StateMachines;

namespace OrderService.Data;

// Deliberately NOT ITenantScopedDbContext / ApplyTenantQueryFilters: SagaDbContext
// is a distinct EF base class from plain DbContext (required by MassTransit's EF
// saga repository), so tenant query filtering has no consumer here.
//
// AbandonedOrderSweeper is the one thing that reads OrderState outside MassTransit's own
// CorrelationId-based correlation, and it wants exactly this: a cross-tenant view of which
// orders actually reached the inventory-reserved state. Anything added here that expects
// tenant scoping would not get it.
public class OrderStateDbContext : SagaDbContext
{
    public OrderStateDbContext(DbContextOptions options) : base(options)
    {
    }

    protected override IEnumerable<ISagaClassMap> Configurations
    {
        get { yield return new OrderStateMap(); }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("order");
        base.OnModelCreating(modelBuilder);
    }
}
