using Common.Library;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OrderService.Auth;
using OrderService.Dtos;
using OrderService.Entities;

namespace OrderService.Controllers;

[ApiController]
[Route("tables")]
public class TableController : ControllerBase
{
    private readonly IRepository<DiningTable> _tableRepo;

    public TableController(IRepository<DiningTable> tableRepo)
    {
        _tableRepo = tableRepo;
    }

    [HttpPost]
    [Authorize(Policy = OrderPolicyExtensions.Write)]
    public async Task<ActionResult<TableDto>> CreateAsync(CreateTableDto dto)
    {
        var table = new DiningTable
        {
            Id = Guid.NewGuid(),
            TableNumber = dto.TableNumber,
            Status = "Available"
        };

        await _tableRepo.CreateAsync(table);
        return Ok(new TableDto(
            table.Id, table.TableNumber, 
            table.Status, table.ActiveCartId));
    }

    [HttpGet]
    [Authorize(Policy = OrderPolicyExtensions.Read)]
    public async Task<ActionResult<IEnumerable<TableDto>>> GetAllAsync()
    {
        var tables = await _tableRepo.GetAllAsync();
        return Ok(tables.Select(t => new TableDto
            (t.Id, t.TableNumber, t.Status, t.ActiveCartId)));
    }

    [HttpPatch("{id}/status")]
    [Authorize(Policy = OrderPolicyExtensions.Write)]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromQuery] string status)
    {
        if (!DiningTable.AllowedStatuses.Contains(status, StringComparer.OrdinalIgnoreCase))
        {
            return BadRequest($"Invalid table status. Allowed values: {string.Join(", ", DiningTable.AllowedStatuses)}");
        }

        var table = await _tableRepo.GetAsync(id);
        if (table == null) return NotFound();

        table.Status = status;
        await _tableRepo.UpdateAsync(table);
        return NoContent();
    }

    [HttpPost("{id}/clear")]
    [Authorize(Policy = OrderPolicyExtensions.Write)]
    public async Task<IActionResult> ClearAsync(Guid id)
    {
        var table = await _tableRepo.GetAsync(id);
        if (table == null) return NotFound();

        table.Status = "Available";
        table.ActiveCartId = null;
        await _tableRepo.UpdateAsync(table);
        return NoContent();
    }
}
