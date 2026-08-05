using System.Globalization;
using System.Threading.RateLimiting;

namespace IdentityService.Features.Discovery;

/// <summary>
/// Rate limiting for the platform's anonymous surface.
///
/// Only <see cref="DinerRegistration"/> is limited today, because it is the only anonymous
/// endpoint that <i>writes</i> - the discovery reads beside it are cacheable and cost a query.
/// Registration mints a real account per call, so unlimited access to it means unlimited rows in
/// the user table and unlimited addresses to send nothing to.
///
/// <para>This is one of three things that endpoint wants and the only one that fits in the
/// service. A CAPTCHA needs a third-party provider and email verification needs an outbound
/// mailer, neither of which this platform has; both are still open, and a limiter is not a
/// substitute for either - it slows a single host down, it does not stop a distributed signup
/// flood or stop anyone signing up as someone else's address.</para>
/// </summary>
public static class RateLimitPolicies
{
    public const string DinerRegistration = "diner-registration";

    /// <summary>Generous for a person - nobody signs up six times in a quarter of an hour -
    /// and low enough that a script grinding through an address list gets nowhere.</summary>
    private const int RegistrationsPerWindow = 5;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(15);

    public static IServiceCollection AddDinerRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.AddPolicy(DinerRegistration, http =>
                RateLimitPartition.GetFixedWindowLimiter(
                    // See the ForwardedHeaders block in Program.cs: this is only a real client
                    // address if the deployment has declared which proxies may set
                    // X-Forwarded-For. The null fallback is one shared bucket, which is the
                    // right way to fail - an unidentifiable caller should be limited, not exempt.
                    partitionKey: http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = RegistrationsPerWindow,
                        Window = Window,
                        // Nothing queues. A caller over the limit is told to come back later
                        // rather than held on an open connection.
                        QueueLimit = 0,
                    }));

            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            options.OnRejected = (context, _) =>
            {
                // Fixed windows have a knowable reset, so say when - otherwise a client's only
                // strategy is to keep trying, which is the traffic being limited.
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter =
                        ((int)retryAfter.TotalSeconds).ToString(NumberFormatInfo.InvariantInfo);
                }

                context.HttpContext.RequestServices
                    .GetRequiredService<ILoggerFactory>()
                    .CreateLogger(typeof(RateLimitPolicies).FullName!)
                    .LogWarning("Rate limited {Method} {Path} from {RemoteIp}",
                        context.HttpContext.Request.Method,
                        context.HttpContext.Request.Path,
                        context.HttpContext.Connection.RemoteIpAddress);

                return ValueTask.CompletedTask;
            };
        });

        return services;
    }
}
