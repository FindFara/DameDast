using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DameDast.Application.Interfaces.Common;

namespace DameDast.Web.Controllers;

[ApiController]
[AllowAnonymous]
public sealed class HealthController(IDatabaseHealth database) : ControllerBase
{
    [HttpGet("/health")]
    public async Task<IActionResult> Read(CancellationToken cancellationToken) =>
        await database.CanConnectAsync(cancellationToken)
            ? Ok(new { status = "ok" })
            : StatusCode(StatusCodes.Status503ServiceUnavailable, new { status = "unavailable" });
}
