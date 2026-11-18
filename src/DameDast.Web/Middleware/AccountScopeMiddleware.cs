using System.Security.Claims;

namespace DameDast.Web.Middleware;

// Bind a browser's outstanding requests to the account that created them.
public sealed class AccountScopeMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Path.StartsWithSegments("/api") || context.Request.Path.StartsWithSegments("/auth") || context.Request.Path.StartsWithSegments("/hubs"))
        {
            context.Response.Headers.CacheControl = "no-store";
            var expected = context.Request.Headers["X-DameDast-User"];
            if (expected.Count > 0 && (expected.Count != 1 || context.User.Identity?.IsAuthenticated != true ||
                expected[0] != context.User.FindFirstValue(ClaimTypes.NameIdentifier)))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { error = "The signed-in account has changed. Reload to continue." });
                return;
            }
        }
        await next(context);
    }
}
