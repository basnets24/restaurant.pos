// Controllers/TableController.cs
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderService.Auth;
using OrderService.Dtos;

[ApiController]
[Route("tables")]
public class TableController : ControllerBase
{
    private readonly ITableService _tableService;

    public TableController(ITableService svc) => _tableService = svc;

    [HttpPost]
    [Authorize(Policy = OrderPolicyExtensions.Write)]
    public async Task<ActionResult<TableDto>> CreateAsync([FromBody] CreateTableDto dto, CancellationToken ct)
    {
        try
        {
            var created = await _tableService.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetByIdAsync), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex) // duplicate number
        {
            return Conflict(ex.Message);
        }
    }

    [HttpGet]
    [Authorize(Policy = OrderPolicyExtensions.Read)]
    public async Task<ActionResult<IEnumerable<TableDto>>> GetAllAsync(
        [FromQuery] string? status, 
        [FromQuery] bool? hasServer, 
        CancellationToken ct)
        => Ok(await _tableService.GetAsync(status, hasServer, ct));

    
    [HttpGet("{id:guid}")]
    [Authorize(Policy = OrderPolicyExtensions.Read)]
    public async Task<ActionResult<TableDto>> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var dto = await _tableService.GetByIdAsync(id, ct);
        return dto is null ? NotFound() : Ok(dto);
    }

    [HttpGet("{id:guid}/status")]
    [Authorize(Policy = OrderPolicyExtensions.Read)]
    public async Task<ActionResult<TableStatusDto>> GetStatusAsync(Guid id, CancellationToken ct)
    {
        try { return Ok(await _tableService.GetStatusAsync(id, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Policy = OrderPolicyExtensions.Write)]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromQuery] string status, CancellationToken ct)
    {
        try { await _tableService.UpdateStatusAsync(id, status, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (ArgumentException ex) { return BadRequest(ex.Message); }
    }

    [HttpPatch("{id:guid}/server")]
    [Authorize(Policy = OrderPolicyExtensions.ManageTables)] // admin/manager
    public async Task<IActionResult> AssignServer(Guid id, [FromBody] AssignServerDto dto, CancellationToken ct)
    {
        try { await _tableService.AssignServerAsync(id, dto.ServerId, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("{id:guid}/assign-self")]
    [Authorize(Policy = OrderPolicyExtensions.AssignSelf)] // servers
    public async Task<IActionResult> AssignSelf(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Forbid();

        try { await _tableService.AssignSelfAsync(id, userId, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return Conflict(ex.Message); }
    }

    [HttpPost("{id:guid}/unassign-self")]
    [Authorize(Policy = OrderPolicyExtensions.AssignSelf)] // servers
    public async Task<IActionResult> UnassignSelf(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Forbid();

        try { await _tableService.UnassignSelfAsync(id, userId, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return Conflict(ex.Message); }
    }

    [HttpPost("{id:guid}/clear")]
    [Authorize(Policy = OrderPolicyExtensions.ManageTables)] // or Write, your choice
    public async Task<IActionResult> Clear(Guid id, CancellationToken ct)
    {
        try { await _tableService.ClearAsync(id, ct); return NoContent(); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    private Guid GetUserId()
    {
        var v = User.FindFirstValue("sub")
             ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
             ?? User.FindFirstValue("uid");
        return Guid.TryParse(v, out var id) ? id : Guid.Empty;
    }
}
