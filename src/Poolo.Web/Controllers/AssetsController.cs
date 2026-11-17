using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Poolo.Application.Features.Assets.Queries;
namespace Poolo.Web.Controllers;
[ApiController, Authorize, Route("api/assets")]
public sealed class AssetsController(ISender sender) : ControllerBase
{
    [HttpGet("{id:guid}/performance")]
    public async Task<IActionResult> Performance(Guid id, CancellationToken cancellationToken)
        => Ok(await sender.Send(new GetAssetPerformanceQuery(id), cancellationToken));
}
