using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DameDast.Application.Features.Workbench.Queries;
using DameDast.Application.Features.Workbench.Models;

namespace DameDast.Web.Controllers;

[ApiController]
[Authorize]
[Route("api/workbench")]
public sealed class WorkbenchController(ISender sender) : ControllerBase
{
    [HttpGet]
    public Task<WorkbenchOverview> Read(CancellationToken cancellationToken) =>
        sender.Send(new GetWorkbenchQuery(), cancellationToken);
}
