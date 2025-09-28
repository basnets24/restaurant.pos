using System;
using System.Threading.Tasks;
using MassTransit;
using System.Diagnostics;
using Activity = System.Diagnostics.Activity;

namespace Common.Library.MassTransit; 

public class ConsumeObserver : IConsumeObserver
{
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
        return Task.CompletedTask;
    }
}