using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace OrderService.Hubs;

public class FloorHub : Hub
{
    private static string? GetClaim(ClaimsPrincipal? user, string type)
        => user?.FindFirst(type)?.Value;


    private static string? GetQueryString(HttpContext? ctx, string key)
        => ctx?.Request?.Query.TryGetValue(key, out var vals) == true ? vals.ToString() : null;


    private static string? GetRestaurantId(HubCallerContext ctx)
        => GetClaim(ctx.User, "restaurant_id")
           ?? GetClaim(ctx.User, "RestaurantId")
           ?? GetQueryString(ctx.GetHttpContext(), "restaurantId");


    private static string? GetLocationId(HubCallerContext ctx)
        => GetClaim(ctx.User, "location_id")
           ?? GetClaim(ctx.User, "LocationId")
           ?? GetQueryString(ctx.GetHttpContext(), "locationId");


    private static string GroupKey(string restaurantId, string locationId)
        => $"tenant:{restaurantId}:loc:{locationId}";


    public override async Task OnConnectedAsync()
    {
        var rid = GetRestaurantId(Context);
        var lid = GetLocationId(Context);


        if (!string.IsNullOrWhiteSpace(rid) && !string.IsNullOrWhiteSpace(lid))
        {
            var group = GroupKey(rid!, lid!);
            await Groups.AddToGroupAsync(Context.ConnectionId, group);
            await Clients.Caller.SendAsync("ConnectedToGroup", new { group });
        }


        await base.OnConnectedAsync();
    }


    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var rid = GetRestaurantId(Context);
        var lid = GetLocationId(Context);
        if (!string.IsNullOrWhiteSpace(rid) && !string.IsNullOrWhiteSpace(lid))
        {
            var group = GroupKey(rid!, lid!);
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, group);
        }
        await base.OnDisconnectedAsync(exception);
    }
}
