using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DameDast.Application.Features.Benchmarks.Models;
using DameDast.Application.Features.Benchmarks.Queries;

namespace DameDast.Web.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/benchmarks")]
public sealed class BenchmarksController(ISender sender) : ControllerBase
{
    [HttpGet]
    public Task<BenchmarkSnapshot> Read(CancellationToken cancellationToken) => sender.Send(new GetBenchmarksQuery(), cancellationToken);
}
