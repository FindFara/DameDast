using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Poolo.Application.Features.Workbench.Queries;
using Poolo.Application.Features.Workbench.Models;

namespace Poolo.Web.Controllers;

[ApiController]
[Authorize]
[Route("api/workbench")]
public sealed class WorkbenchController(ISender sender) : ControllerBase
{
    [HttpGet]
    public Task<WorkbenchOverview> Read(CancellationToken cancellationToken) =>
        sender.Send(new GetWorkbenchQuery(), cancellationToken);
}
