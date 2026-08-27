// Controllers/NotificationsController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderService.Auth;
using OrderService.Dtos;
using OrderService.Interfaces;

namespace OrderService.Controllers;

[ApiController]
[Route("api/notifications")]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _svc;

    public NotificationsController(INotificationService svc)
    {
        _svc = svc;
    }

    [HttpGet]
    [Authorize(Policy = OrderPolicyExtensions.Read)]
    [ProducesResponseType(typeof(IReadOnlyList<NotificationViewDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] int take, CancellationToken ct)
        => Ok(await _svc.GetAllAsync(take <= 0 ? 50 : take, ct));

    [HttpPost("{id}/read")]
    [Authorize(Policy = OrderPolicyExtensions.Read)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkAsRead(Guid id, CancellationToken ct)
    {
        await _svc.MarkAsReadAsync(id, ct);
        return NoContent();
    }
}
