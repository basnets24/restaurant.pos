using System.Collections.Concurrent;

namespace PaymentService.Services;

public interface IPaymentSessionNotifier
{
    /// <summary>Wakes any waiter registered for this order, or does nothing if none is waiting.</summary>
    void NotifyUpdated(Guid orderId);

    /// <summary>Suspends until NotifyUpdated(orderId) fires, the timeout elapses, or
    /// cancellationToken fires. Returns true only for the first case - callers must re-check
    /// the payment's actual state either way, since a wakeup just means "something changed",
    /// not what changed.</summary>
    Task<bool> WaitForUpdateAsync(Guid orderId, TimeSpan timeout, CancellationToken cancellationToken);
}

// In-memory only - relies on PaymentService running as a single instance (see deploy/README.md:
// single VM, no horizontal scaling), the same assumption Order service's FloorHub SignalR setup
// makes. A waiter registered here only ever sees a NotifyUpdated call from PaymentRequestedConsumer
// running in this same process; there is no cross-instance fan-out.
public class PaymentSessionNotifier : IPaymentSessionNotifier
{
    private readonly ConcurrentDictionary<Guid, ConcurrentBag<TaskCompletionSource<bool>>> _waiters = new();

    public Task<bool> WaitForUpdateAsync(Guid orderId, TimeSpan timeout, CancellationToken cancellationToken)
    {
        var tcs = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        _waiters.GetOrAdd(orderId, _ => new ConcurrentBag<TaskCompletionSource<bool>>()).Add(tcs);

        var timeoutCts = new CancellationTokenSource(timeout);
        var cancelRegistration = cancellationToken.Register(() => tcs.TrySetResult(false));
        var timeoutRegistration = timeoutCts.Token.Register(() => tcs.TrySetResult(false));

        return tcs.Task.ContinueWith(t =>
        {
            cancelRegistration.Dispose();
            timeoutRegistration.Dispose();
            timeoutCts.Dispose();
            return t.Result;
        }, CancellationToken.None, TaskContinuationOptions.ExecuteSynchronously, TaskScheduler.Default);
    }

    public void NotifyUpdated(Guid orderId)
    {
        if (_waiters.TryRemove(orderId, out var bag))
        {
            foreach (var tcs in bag) tcs.TrySetResult(true);
        }
    }
}
