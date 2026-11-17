using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using DameDast.Web.Configuration;

namespace DameDast.Web.Controllers;

[ApiController]
[AllowAnonymous]
[Route("auth")]
public sealed class AuthController(GoogleAuthenticationSettings google) : ControllerBase
{
    [HttpGet("google")]
    public IActionResult Google([FromQuery] string? returnUrl = null) => google.Configured ? Challenge(new AuthenticationProperties { RedirectUri = Url.IsLocalUrl(returnUrl) ? returnUrl : "/" }, GoogleDefaults.AuthenticationScheme) : Redirect("/?authError=not-configured");
    [HttpGet("google/status")]
    public IActionResult Status() => Ok(new
    {
        configured = google.Configured,
        callbackUrl = $"{Request.Scheme}://{Request.Host}/signin-google",
        missingSettings = google.Configured ? Array.Empty<string>() : new[] { "Authentication:Google:ClientId", "Authentication:Google:ClientSecret" }
    });

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }
}
