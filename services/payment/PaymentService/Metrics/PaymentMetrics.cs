using System.Diagnostics.Metrics;

namespace PaymentService.Metrics;

/// <summary>Business-outcome counters for payment confirmation - not covered by MassTransit's
/// own meter, which tracks throughput/duration but not whether Stripe actually approved the charge.
/// "Payment" is already registered via AddMeter(settings.ServiceName) in AddMetrics().</summary>
public static class PaymentMetrics
{
    private static readonly Meter Meter = new("Payment");

    public static readonly Counter<long> PaymentsSucceeded = Meter.CreateCounter<long>(
        "payments_succeeded_total",
        description: "Count of payments confirmed succeeded by Stripe.");

    public static readonly Counter<long> PaymentsFailed = Meter.CreateCounter<long>(
        "payments_failed_total",
        description: "Count of payments confirmed failed/canceled by Stripe.");
}
