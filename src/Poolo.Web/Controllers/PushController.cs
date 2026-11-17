using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Poolo.Application.Features.Reminders.Commands;
using Poolo.Application.Features.Reminders.Models;
using Poolo.Application.Features.Reminders.Queries;

namespace Poolo.Web.Controllers;

[ApiController]
[Authorize]
[Route("api/push")]
public sealed class PushController(ISender sender) : ControllerBase
{
    [HttpGet("key")]
    public Task<PushPublicKey> Key(CancellationToken cancellationToken) => sender.Send(new GetPushKeyQuery(), cancellationToken);
    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] PushRegistration request, CancellationToken cancellationToken)
    {
        await sender.Send(new RegisterPushCommand(request), cancellationToken);
        return NoContent();
    }

    [HttpPost("unsubscribe")]
    public async Task<IActionResult> Unsubscribe([FromBody] UnsubscribePushRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new RemovePushCommand(request.Endpoint), cancellationToken);
        return NoContent();
    }
}

public sealed record UnsubscribePushRequest(string Endpoint);
