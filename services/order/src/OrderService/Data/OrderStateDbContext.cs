using MassTransit.EntityFrameworkCoreIntegration;
using Microsoft.EntityFrameworkCore;
using OrderService.StateMachines;

namespace OrderService.Data;

// Deliberately NOT ITenantScopedDbContext / ApplyTenantQueryFilters: SagaDbContext
// is a distinct EF base class from plain DbContext (required by MassTransit's EF
// saga repository), and nothing queries OrderState directly outside MassTransit's
// own CorrelationId-based correlation, so tenant query filtering has no consumer here.
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
