// Common.Library/Tenancy/TenancyBus.cs
using MassTransit;
using Microsoft.Extensions.DependencyInjection;

namespace Common.Library.Tenancy;

// Header names must match your HTTP middleware
public static class TenantHeaderNames
{
    public const string Restaurant = "X-Restaurant-Id";
    public const string Location   = "X-Location-Id";
}

/// <summary>
/// Unified bus filter that stamps tenant headers for both Send and Publish pipelines.
/// </summary>
public sealed class TenantBusFilter<T> :
    IFilter<SendContext<T>>,
    IFilter<PublishContext<T>>
    where T : class
{
    private readonly TenantMiddleware.TenantContextHolder _holder;
    public TenantBusFilter(TenantMiddleware.TenantContextHolder holder) => _holder = holder;

    public void Probe(ProbeContext context) => context.CreateFilterScope("tenant-bus");

    public Task Send(SendContext<T> ctx, IPipe<SendContext<T>> next)
        => StampHeaders(ctx, () => next.Send(ctx));

    public Task Send(PublishContext<T> ctx, IPipe<PublishContext<T>> next)
        => StampHeaders(ctx, () => next.Send(ctx));

    private Task StampHeaders(SendContext ctx, Func<Task> next)
    {
        // Respect existing headers if already set by the publisher
        var rid = ctx.Headers.Get<string>(TenantHeaderNames.Restaurant) ?? _holder.Current?.RestaurantId;
        var lid = ctx.Headers.Get<string>(TenantHeaderNames.Location)   ?? _holder.Current?.LocationId;

        if (!string.IsNullOrWhiteSpace(rid)) ctx.Headers.Set(TenantHeaderNames.Restaurant, rid);
        if (!string.IsNullOrWhiteSpace(lid)) ctx.Headers.Set(TenantHeaderNames.Location,   lid);

        return next();
    }
}

/// <summary>
/// Restores tenant context from incoming message headers for each consumer scope.
/// Throws if headers are missing, to avoid cross-tenant leaks.
/// </summary>
public sealed class TenantConsumeFilter<T> : IFilter<ConsumeContext<T>> where T : class
{
    private readonly TenantMiddleware.TenantContextHolder _holder;
    public TenantConsumeFilter(TenantMiddleware.TenantContextHolder holder) => _holder = holder;

    public void Probe(ProbeContext context) => context.CreateFilterScope("tenant-consume");

    public async Task Send(ConsumeContext<T> ctx, IPipe<ConsumeContext<T>> next)
    {
        var rid = ctx.Headers.Get<string>(TenantHeaderNames.Restaurant);
        var lid = ctx.Headers.Get<string>(TenantHeaderNames.Location);

        if (string.IsNullOrWhiteSpace(rid) || string.IsNullOrWhiteSpace(lid))
            throw new InvalidOperationException(
                $"TenantContext not set (missing {TenantHeaderNames.Restaurant} or {TenantHeaderNames.Location}).");

        _holder.Set(new TenantContext { RestaurantId = rid!, LocationId = lid! });
        try { await next.Send(ctx); }
        finally { /* optional: _holder.Clear(); */ }
    }
}

/// <summary>DI + cfg helpers used by your MassTransit extensions.</summary>
public static class TenancyBusConfiguratorExtensions
{
    public static IServiceCollection AddTenantBusTenancy(this IServiceCollection services)
    {
        // Make filters resolvable in the scoped container
        services.AddScoped(typeof(TenantBusFilter<>));
        services.AddScoped(typeof(TenantConsumeFilter<>));
        return services;
    }

    public static void UseTenantPropagation(this IBusFactoryConfigurator cfg, IBusRegistrationContext context)
    {
        // Outgoing: add tenant headers for both Send and Publish (unified filter)
        cfg.UseSendFilter(typeof(TenantBusFilter<>), context);
        cfg.UsePublishFilter(typeof(TenantBusFilter<>), context);

        // Incoming: restore tenant for handlers
        cfg.UseConsumeFilter(typeof(TenantConsumeFilter<>), context);
    }
}
