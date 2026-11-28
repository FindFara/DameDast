using System.Security.Claims;
using DameDast.Application.Interfaces.Sessions;

namespace DameDast.Web.Identity;

public sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? User => accessor.HttpContext?.User;
    public bool IsAdmin => IsAuthenticated && User?.IsInRole("Admin") == true;
    public bool IsAuthenticated => User?.Identity?.IsAuthenticated == true;
    public string? Id => User?.FindFirstValue(ClaimTypes.NameIdentifier);
    public string? Name => User?.Identity?.Name;
    public string? PictureUrl => ReadPictureUrl();

    public string RequireId() => IsAuthenticated && !string.IsNullOrWhiteSpace(Id) ? Id : throw new UnauthorizedAccessException("Sign in to continue.");

    private string? ReadPictureUrl()
    {
        var value = IsAuthenticated ? User?.FindFirstValue("urn:google:picture") : null;
        if (value is null || value.Length > 2048 || !Uri.TryCreate(value, UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps || uri.UserInfo.Length != 0 || !uri.IsDefaultPort)
            return null;
        return uri.Host.EndsWith(".googleusercontent.com", StringComparison.OrdinalIgnoreCase)
            || uri.Host.Equals("googleusercontent.com", StringComparison.OrdinalIgnoreCase)
            ? uri.AbsoluteUri : null;
    }
}
