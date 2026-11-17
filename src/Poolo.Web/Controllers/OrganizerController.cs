using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Poolo.Application.Features.Organizer.Models;
using Poolo.Application.Features.Organizer.Queries;

namespace Poolo.Web.Controllers;

[ApiController]
[Authorize]
[Route("api/organizer")]
public sealed class OrganizerController(ISender sender) : ControllerBase
{
    [HttpGet]
    public Task<OrganizerOverview> Read(CancellationToken cancellationToken) => sender.Send(new GetOrganizerQuery(), cancellationToken);
}
