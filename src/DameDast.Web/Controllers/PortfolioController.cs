using MediatR;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DameDast.Application.Features.FinanceRecords.Models;
using DameDast.Application.Features.Portfolio.Commands;
using DameDast.Application.Features.Portfolio.Queries;
using DameDast.Application.Features.Sessions.Queries;

namespace DameDast.Web.Controllers;

[ApiController]
[Authorize]
[Route("api/portfolio")]
public sealed class PortfolioController(ISender sender, IAntiforgery antiforgery) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("session")]
    public async Task<IActionResult> Session(CancellationToken cancellationToken)
    {
        var session = await sender.Send(new GetSessionQuery(), cancellationToken);
        return Ok(new { session.Authenticated, session.UserId, session.Name, syncProvider = "google", csrf = antiforgery.GetAndStoreTokens(HttpContext).RequestToken });
    }

    [HttpGet]
    public Task<Snapshot> Read(CancellationToken cancellationToken) => sender.Send(new GetPortfolioQuery(), cancellationToken);
    [HttpPost("sync")]
    [RequestSizeLimit(256_000)]
    public Task<Snapshot> Sync([FromBody] SyncRequest request, CancellationToken cancellationToken) => sender.Send(new SyncPortfolioCommand(request), cancellationToken);
}
