using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Poolo.Application.Features.FinanceRecords.Commands;
using Poolo.Application.Features.FinanceRecords.Models;
using Poolo.Application.Features.FinanceRecords.Queries;

namespace Poolo.Web.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public sealed class FinanceController(ISender sender) : ControllerBase
{
    [HttpGet("finance")]
    public Task<Snapshot> Read(CancellationToken cancellationToken) => sender.Send(new GetFinanceQuery(), cancellationToken);
    [HttpPost("sync")]
    [RequestSizeLimit(1_000_000)]
    public Task<Snapshot> Sync([FromBody] SyncRequest request, CancellationToken cancellationToken) => sender.Send(new SyncFinanceCommand(request), cancellationToken);
}
