namespace OrderService.Settings;

/// <summary>Tuning for <see cref="Services.AbandonedOrderSweeper"/>.</summary>
public class AbandonedOrderSettings
{
    /// <summary>Turns the sweep off entirely. Leave it on: without it an abandoned pickup order
    /// holds its stock forever, because cancelling is otherwise a manual operator action.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>How long a fired-but-unpaid pickup order may sit before it is cancelled and its
    /// stock released. Short on purpose - the diner has already been shown a card form by this
    /// point, so the only thing this window protects is someone typing slowly.</summary>
    public TimeSpan Ttl { get; set; } = TimeSpan.FromMinutes(5);

    /// <summary>How often to look. The real granularity of expiry is Ttl + Interval, so keep
    /// this well under Ttl or orders live noticeably longer than the TTL suggests.</summary>
    public TimeSpan Interval { get; set; } = TimeSpan.FromMinutes(1);
}
