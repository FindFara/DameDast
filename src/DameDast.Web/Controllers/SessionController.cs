using MediatR;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DameDast.Application.Features.Sessions.Queries;
using DameDast.Web.Configuration;

namespace DameDast.Web.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/session")]
public sealed class SessionController(ISender sender, IAntiforgery antiforgery, GoogleAuthenticationSettings google, IConfiguration configuration) : ControllerBase
{
    [HttpGet]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Read(CancellationToken cancellationToken)
    {
        var session = await sender.Send(new GetSessionQuery(), cancellationToken);
        return Ok(new { session.Authenticated, session.UserId, session.Name, session.PictureUrl, googleConfigured = google.Configured, demoEnabled = configuration.GetValue<bool>("Features:DemoData"), session.PushConfigured, csrf = antiforgery.GetAndStoreTokens(HttpContext).RequestToken });
    }
}
