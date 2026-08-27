using System.Diagnostics.Metrics;

namespace OrderService.Metrics;

/// <summary>Business-outcome counters for the order saga - not covered by MassTransit's
/// own meter, which tracks throughput/duration but not what a saga actually decided.
/// "Order" is already registered via AddMeter(settings.ServiceName) in AddMetrics().</summary>
public static class OrderMetrics
{
    private static readonly Meter Meter = new("Order");

    public static readonly Counter<long> OrdersConfirmed = Meter.CreateCounter<long>(
        "orders_confirmed_total",
        description: "Count of orders confirmed (inventory reserved successfully).");

    public static readonly Counter<long> OrdersRejected = Meter.CreateCounter<long>(
        "orders_rejected_total",
        description: "Count of orders rejected (inventory reservation faulted).");
}
