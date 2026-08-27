using System;
using System.Collections.Generic;
using System.Diagnostics.Metrics;
using System.Threading.Tasks;
using MassTransit;
using System.Diagnostics;
using Activity = System.Diagnostics.Activity;

namespace Common.Library.MassTransit;

public class ConsumeObserver : IConsumeObserver
{
    // "MassTransit" is already registered via AddMeter("MassTransit") in every
    // service's AddMetrics() call, alongside MassTransit's own built-in meter -
    // this rides the same registration rather than needing a new AddMeter() call.
    private static readonly Meter Meter = new("MassTransit");
    private static readonly Counter<long> ConsumeFaultCounter = Meter.CreateCounter<long>(
        "messaging_consume_fault_total",
        description: "Count of message consume failures, by message type and exception type - " +
                     "MassTransit's own meter has no success/failure dimension.");

    public Task PreConsume<T>(ConsumeContext<T> context) where T : class
    {
        return Task.CompletedTask;
    }

    public Task PostConsume<T>(ConsumeContext<T> context) where T : class
    {
        return Task.CompletedTask;
    }

    public Task ConsumeFault<T>(ConsumeContext<T> context, Exception exception) where T : class
    {
        Activity.Current?.SetStatus(ActivityStatusCode.Error, exception.Message);
        ConsumeFaultCounter.Add(1,
            new KeyValuePair<string, object?>("message_type", typeof(T).Name),
            new KeyValuePair<string, object?>("exception_type", exception.GetType().Name));
        return Task.CompletedTask;
    }
}