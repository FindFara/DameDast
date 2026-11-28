using DameDast.Application.Features.Administration;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DameDast.Web.Areas.Admin.Controllers;

[ApiController]
[Area("Admin")]
[Authorize(Roles = "Admin")]
[Route("admin/api")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class ManagementController(ISender sender, TimeProvider time) : ControllerBase
{
    [HttpGet("users")]
    public Task<UserPage> Users([FromQuery] string? search, [FromQuery] int page = 1, CancellationToken cancellationToken = default) => sender.Send(new GetUsersQuery(search, page), cancellationToken);
    [HttpPost("users")]
    public async Task<IActionResult> CreateUser(SaveUser user, CancellationToken ct)
    {
        await sender.Send(new SaveUserCommand(user, true), ct);
        return NoContent();
    }
    [HttpPut("users")]
    public async Task<IActionResult> UpdateUser(SaveUser user, CancellationToken ct)
    {
        await sender.Send(new SaveUserCommand(user, false), ct);
        return NoContent();
    }
    [HttpGet("roles")]
    public Task<IReadOnlyList<AdminRole>> Roles(CancellationToken ct) => sender.Send(new GetRolesQuery(), ct);
    [HttpPost("roles")]
    public async Task<IActionResult> SaveRole(SaveRoleCommand command, CancellationToken ct)
    {
        await sender.Send(command, ct);
        return NoContent();
    }
    [HttpDelete("roles/{name}")]
    public async Task<IActionResult> DeleteRole(string name, CancellationToken ct)
    {
        await sender.Send(new DeleteRoleCommand(name), ct);
        return NoContent();
    }
    [HttpGet("views")]
    public Task<PageViewReport> Views([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? page, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(time.GetUtcNow().UtcDateTime);
        return sender.Send(new GetPageViewsQuery(from ?? today.AddDays(-29), to ?? today, page), ct);
    }
}
