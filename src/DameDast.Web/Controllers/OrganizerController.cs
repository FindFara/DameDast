using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DameDast.Application.Features.Organizer.Models;
using DameDast.Application.Features.Organizer.Queries;

namespace DameDast.Web.Controllers;

[ApiController]
[Authorize]
[Route("api/organizer")]
public sealed class OrganizerController(ISender sender) : ControllerBase
{
    [HttpGet]
    public Task<OrganizerOverview> Read(CancellationToken cancellationToken) => sender.Send(new GetOrganizerQuery(), cancellationToken);
}
