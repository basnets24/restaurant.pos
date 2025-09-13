using System.Net.Http.Json;

namespace IdentityService.Services;

public class HttpTenantClaimsProvider : ITenantClaimsProvider
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private string? _cachedToken;
    private DateTimeOffset _cachedTokenExpiresAt;

    public HttpTenantClaimsProvider(HttpClient http, IConfiguration config)
    {
        _http = http;
        _config = config;
    }

    public async Task<TenantClaimResult?> GetAsync(Guid userId, CancellationToken ct)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, $"internal/users/{userId}/tenant-claims");
        var token = await GetAccessTokenAsync(ct);
        if (!string.IsNullOrEmpty(token))
            req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        using var res = await SendWithRetryAsync(() => _http.SendAsync(req, ct), ct);
        if (!res.IsSuccessStatusCode)
            return null;

        var payload = await res.Content.ReadFromJsonAsync<TenantClaimsDto>(cancellationToken: ct);
        if (payload is null || string.IsNullOrWhiteSpace(payload.restaurantId))
            return null;
        IReadOnlyCollection<string> roles = payload.roles ?? new List<string>();
        return new TenantClaimResult(payload.restaurantId, payload.locationId, roles);
    }

    private sealed class TenantClaimsDto
    {
        public string? restaurantId { get; set; }
        public string? locationId { get; set; }
        public List<string>? roles { get; set; }
    }

    private async Task<string?> GetAccessTokenAsync(CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(_cachedToken) && _cachedTokenExpiresAt > DateTimeOffset.UtcNow.AddSeconds(5))
            return _cachedToken;

        var authority = _config["TenantService:Authority"]?.TrimEnd('/');
        var clientId = _config["TenantService:ClientId"];
        var clientSecret = _config["TenantService:ClientSecret"];
        var scope = _config["TenantService:Scope"] ?? "tenant.claims.read";
        if (string.IsNullOrWhiteSpace(authority) || string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
            return null; // misconfigured, gracefully degrade

        using var tokenClient = new HttpClient { BaseAddress = new Uri(authority) };
        using var req = new HttpRequestMessage(HttpMethod.Post, "/connect/token")
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "client_credentials",
                ["client_id"] = clientId,
                ["client_secret"] = clientSecret,
                ["scope"] = scope
            })
        };
        using var res = await SendWithRetryAsync(() => tokenClient.SendAsync(req, ct), ct);
        if (!res.IsSuccessStatusCode)
            return null;

        var payload = await res.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken: ct);
        if (payload?.access_token is null) return null;
        _cachedToken = payload.access_token;
        var expiresIn = payload.expires_in <= 0 ? 300 : payload.expires_in;
        _cachedTokenExpiresAt = DateTimeOffset.UtcNow.AddSeconds(Math.Min(expiresIn, 300));
        return _cachedToken;
    }

    private sealed class TokenResponse { public string? access_token { get; set; } public int expires_in { get; set; } }
    private static bool IsTransient(HttpResponseMessage res)
        => (int)res.StatusCode is 408 or 429 or >= 500;

    private static bool IsTransient(Exception ex)
        => ex is HttpRequestException || ex is TaskCanceledException;

    private static async Task<HttpResponseMessage> SendWithRetryAsync(Func<Task<HttpResponseMessage>> send, CancellationToken ct)
    {
        var delays = new[] { 100, 300, 700 };
        HttpResponseMessage? last = null;
        for (var i = 0; i < delays.Length; i++)
        {
            try
            {
                var res = await send();
                if (res.IsSuccessStatusCode || !IsTransient(res))
                    return res;
                last = res;
            }
            catch (Exception ex) when (IsTransient(ex) && i < delays.Length - 1)
            {
                // swallow and retry
            }
            await Task.Delay(delays[i], ct);
        }
        return last ?? await send();
    }
}
