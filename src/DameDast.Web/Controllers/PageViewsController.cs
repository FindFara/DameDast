using DameDast.Application.Features.Administration;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DameDast.Web.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/analytics/page-view")]
[EnableRateLimiting("page-views")]
public sealed class PageViewsController(ISender sender) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Record(TrackPageViewCommand command, CancellationToken ct)
    {
        await sender.Send(command, ct);
        return NoContent();
    }
}
