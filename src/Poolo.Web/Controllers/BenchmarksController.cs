using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Poolo.Application.Features.Benchmarks.Models;
using Poolo.Application.Features.Benchmarks.Queries;

namespace Poolo.Web.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/benchmarks")]
public sealed class BenchmarksController(ISender sender) : ControllerBase
{
    [HttpGet]
    public Task<BenchmarkSnapshot> Read(CancellationToken cancellationToken) => sender.Send(new GetBenchmarksQuery(), cancellationToken);
}
