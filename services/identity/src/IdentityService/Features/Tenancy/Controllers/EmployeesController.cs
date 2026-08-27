using Duende.IdentityServer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using IdentityService.Common.Extensions;
using IdentityService.Features.Identity.DTOs;
using IdentityService.Features.Tenancy.DTOs;
using IdentityService.Features.Tenancy.Services;
using IdentityService.Features.Shared.DTOs;
using Tenant.Domain;

namespace IdentityService.Features.Tenancy.Controllers;

[ApiController]
[Route("tenants/{restaurantId}/employees")]
[Authorize(Policy = IdentityServerConstants.LocalApi.PolicyName)]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _employeeService;
    private readonly ILogger<EmployeesController> _logger;

    public EmployeesController(IEmployeeService employeeService, ILogger<EmployeesController> logger)
    {
        _employeeService = employeeService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<Paged<EmployeeListItemDto>>> List(
        string restaurantId,
        [FromQuery] string? q,
        [FromQuery] string? role,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25,
        CancellationToken ct = default)
    {
        if (!User.TryGetUserId(out var callerId))
            return Unauthorized();

        page = page < 1 ? 1 : page;
        pageSize = pageSize is < 1 or > 200 ? 25 : pageSize;

        try
        {
            var result = await _employeeService.ListEmployeesAsync(callerId, restaurantId, q, role, page, pageSize, ct);
            return Ok(result);
        }
        catch (InvalidOperationException)
        {
            return Forbid();
        }
    }

    [HttpGet("{userId:guid}")]
    public async Task<ActionResult<EmployeeDetailDto>> GetById(string restaurantId, Guid userId, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var callerId))
            return Unauthorized();

        try
        {
            var employee = await _employeeService.GetEmployeeAsync(callerId, restaurantId, userId, ct);
            if (employee is null)
                return NotFound();
            return Ok(employee);
        }
        catch (InvalidOperationException)
        {
            return Forbid();
        }
    }

    [HttpPut("{userId:guid}")]
    public async Task<IActionResult> Update(string restaurantId, Guid userId, [FromBody] UserUpdateDto dto, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var callerId))
            return Unauthorized();

        try
        {
            await _employeeService.UpdateEmployeeAsync(callerId, restaurantId, userId, dto, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            if (ex.Message.Contains("admin"))
                return Forbid();
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("{userId:guid}/roles")]
    public async Task<ActionResult<IReadOnlyCollection<string>>> GetTenantRoles(string restaurantId, Guid userId, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var callerId))
            return Unauthorized();

        try
        {
            var roles = await _employeeService.GetEmployeeRolesAsync(callerId, restaurantId, userId, ct);
            return Ok(roles);
        }
        catch (InvalidOperationException)
        {
            return Forbid();
        }
    }

    [HttpPost("{userId:guid}/roles")]
    public async Task<IActionResult> AddTenantRoles(string restaurantId, Guid userId, [FromBody] EmployeeRoleUpdateDto dto, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var callerId))
            return Unauthorized();

        try
        {
            await _employeeService.AddEmployeeRolesAsync(callerId, restaurantId, userId, dto, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound("User is not a member of this restaurant.");
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException)
        {
            return Forbid();
        }
    }

    [HttpDelete("{userId:guid}/roles/{role}")]
    public async Task<IActionResult> RemoveTenantRole(string restaurantId, Guid userId, string role, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var callerId))
            return Unauthorized();

        try
        {
            await _employeeService.RemoveEmployeeRoleAsync(callerId, restaurantId, userId, role, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException)
        {
            return Forbid();
        }
    }

    [HttpPost]
    public async Task<IActionResult> AddEmployee(string restaurantId, [FromBody] AddEmployeeDto dto, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var callerId))
            return Unauthorized();

        try
        {
            await _employeeService.AddEmployeeAsync(callerId, restaurantId, dto, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException)
        {
            return Forbid();
        }
    }

    [HttpPut("{userId:guid}/default-location")]
    public async Task<IActionResult> UpdateDefaultLocation(string restaurantId, Guid userId, [FromBody] DefaultLocationUpdateDto dto, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var callerId))
            return Unauthorized();

        try
        {
            await _employeeService.UpdateEmployeeDefaultLocationAsync(callerId, restaurantId, userId, dto, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException)
        {
            return Forbid();
        }
    }

    [HttpGet("roles")]
    public async Task<ActionResult<IReadOnlyCollection<string>>> GetAvailableRoles(CancellationToken ct)
    {
        var roles = await _employeeService.GetAvailableRolesAsync(ct);
        return Ok(roles);
    }
}
