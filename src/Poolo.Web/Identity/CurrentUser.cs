using System.Security.Claims;
using Poolo.Application.Interfaces.Sessions;

namespace Poolo.Web.Identity;

public sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? User => accessor.HttpContext?.User;
    public bool IsAuthenticated => User?.Identity?.IsAuthenticated == true;
    public string? Id => User?.FindFirstValue(ClaimTypes.NameIdentifier);
    public string? Name => User?.Identity?.Name;

    public string RequireId() => IsAuthenticated && !string.IsNullOrWhiteSpace(Id) ? Id : throw new UnauthorizedAccessException("Sign in to continue.");
}
