// Controllers/TableController.cs
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderService.Auth;
using OrderService.Dtos;
using OrderService.Interfaces;

namespace OrderService.Controllers;

[ApiController]
[Route("api/tables")]
public class TableController : ControllerBase
{
    private readonly IDiningTableService _svc;
    private readonly ILogger<TableController> _log;
    
    public TableController(IDiningTableService svc, ILogger<TableController> log)
    {
        _svc = svc;
        _log = log;
    }

    // --------- Reads ---------
    [HttpGet]
    [Authorize] // adjust policy/roles
    [ProducesResponseType(typeof(IReadOnlyList<TableViewDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
        => Ok(await _svc.GetAllAsync(ct));


    [HttpGet("{id}")]
    [Authorize]
    [ProducesResponseType(typeof(TableViewDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var t = await _svc.GetByIdAsync(id, ct);
        return t is null ? NotFound() : Ok(t);
    }

    // --------- Runtime ops ---------
    [HttpPatch("{id}/status")]
    [Authorize] // Server/Host
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetTableStatusDto body, CancellationToken ct)
    {
        await _svc.SetStatusAsync(id, body, ct);
        return NoContent();
    }


    [HttpPost("{id}/seat")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Seat(Guid id, [FromBody] SeatPartyDto body, CancellationToken ct)
    {
        await _svc.SetStatusAsync(id, new SetTableStatusDto("occupied", body.PartySize), ct);
        return NoContent();
    }


    [HttpPost("{id}/clear")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Clear(Guid id, CancellationToken ct)
    {
        await _svc.ClearAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id}/link-order")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> LinkOrder(Guid id, [FromBody] LinkOrderDto body, CancellationToken ct)
    {
        await _svc.LinkOrderAsync(id, body.OrderId, ct);
        return NoContent();
    }


    [HttpPost("{id}/unlink-order")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UnlinkOrder(Guid id, [FromBody] LinkOrderDto body, CancellationToken ct)
    {
        await _svc.UnlinkOrderAsync(id, body.OrderId, ct);
        return NoContent();
    }

    // --------- Layout / Designer ---------

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")] // adjust
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateTableDto body, CancellationToken ct)
    {
        var id = await _svc.CreateAsync(body, ct);
        return CreatedAtAction(nameof(GetById), new { id }, null);
    }


    [HttpPatch("{id}/layout")]
    [Authorize(Roles = "Admin,Manager")] // adjust
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UpdateLayout(Guid id, [FromBody] UpdateTableLayoutDto body, CancellationToken ct)
    {
        await _svc.UpdateLayoutAsync(id, body, ct);
        return NoContent();
    }


    [HttpPost("layout/bulk")]
    [Authorize(Roles = "Admin,Manager")] // adjust
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> BulkLayout([FromBody] BulkLayoutUpdateDto body, CancellationToken ct)
    {
        await _svc.BulkUpdateLayoutAsync(body, ct);
        return NoContent();
    }


    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Manager")] // adjust
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete( Guid id, CancellationToken ct)
    {
        await _svc.DeleteAsync(id, ct);
        return NoContent();
    }

    // --------- Join / Split (optional) ---------
    [HttpPost("join")]
    [Authorize(Roles = "Admin,Manager")] // adjust
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> Join([FromBody] JoinTablesDto body, CancellationToken ct)
    {
        var groupId = await _svc.JoinAsync(body, ct);
        return Ok(new { groupId });
    }


    [HttpPost("split")]
    [Authorize(Roles = "Admin,Manager")] // adjust
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Split([FromBody] SplitTablesDto body, CancellationToken ct)
    {
        await _svc.SplitAsync(body, ct);
        return NoContent();
    }



}
