using System.Security.Claims;
using DameDast.Application.Features.Administration;
using DameDast.Application.Interfaces.Administration;

namespace DameDast.Web.Middleware;

public sealed class UserDirectoryMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, IAdministrationRepository users)
    {
        if (context.User.Identity?.IsAuthenticated == true && context.User.FindFirstValue(ClaimTypes.NameIdentifier) is { } id)
        {
            var access = await users.EnsureUserAsync(new UserIdentity(id, context.User.Identity.Name, context.User.FindFirstValue(ClaimTypes.Email)), context.RequestAborted);
            // Never trust roles cached in an old authentication ticket.
            foreach (var identity in context.User.Identities)
                foreach (var claim in identity.FindAll(identity.RoleClaimType).ToArray()) identity.RemoveClaim(claim);
            if (!access.IsActive && context.Request.Path != "/auth/logout")
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.Headers.CacheControl = "no-store";
                await context.Response.WriteAsJsonAsync(new { error = "This account is disabled. Contact an administrator." }, context.RequestAborted);
                return;
            }
            if (access.IsActive && context.User.Identity is ClaimsIdentity active)
                active.AddClaims(access.Roles.Select(role => new Claim(active.RoleClaimType, role)));
        }
        await next(context);
    }
}
