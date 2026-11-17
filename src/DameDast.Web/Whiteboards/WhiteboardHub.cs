using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.SignalR;
using DameDast.Application.Interfaces.Sessions;
using DameDast.Application.Interfaces.Whiteboards;
using DameDast.Domain;

namespace DameDast.Web.Whiteboards;

public sealed record WhiteboardPresence(string ConnectionId, Guid DocumentId, string Name, string? UserId, string? Token);
public sealed class WhiteboardPresenceRegistry
{
    public ConcurrentDictionary<string, WhiteboardPresence> Connections { get; } = new();
}

public sealed class WhiteboardHub(IWhiteboardService service, IAntiforgery antiforgery,
    WhiteboardPresenceRegistry registry) : Hub
{
    public static string Room(Guid id) => "whiteboard:" + id.ToString("N");

    public async Task<WhiteboardAccess> Join(Guid documentId, string? token, string name, string? csrf)
    {
        var http = Context.GetHttpContext() ?? throw new HubException("No connection context.");
        CheckOrigin(http);
        var userId = Context.User?.Identity?.IsAuthenticated == true ? Context.User.FindFirstValue(ClaimTypes.NameIdentifier) : null;
        if (string.IsNullOrEmpty(token))
        {
            if (string.IsNullOrWhiteSpace(userId)) throw new UnauthorizedAccessException();
            http.Request.Headers["X-CSRF-TOKEN"] = csrf;
            await antiforgery.ValidateRequestAsync(http);
        }
        var access = await service.ReadAsync(documentId, userId, token, Context.ConnectionAborted);
        if (!access.Exists) throw new HubException("Save the document before joining.");
        await LeavePreviousAsync(Context.ConnectionAborted);
        var displayName = string.IsNullOrWhiteSpace(name) ? "Guest" : name.Trim()[..Math.Min(name.Trim().Length, 64)];
        registry.Connections[Context.ConnectionId] = new(Context.ConnectionId, documentId, displayName, userId, token);
        await Groups.AddToGroupAsync(Context.ConnectionId, Room(documentId), Context.ConnectionAborted);
        await PublishPresenceAsync(documentId, Context.ConnectionAborted);
        return access;
    }

    public async Task Cursor(double x, double y, string button)
    {
        if (!double.IsFinite(x) || !double.IsFinite(y) || Math.Abs(x) > 10_000_000 || Math.Abs(y) > 10_000_000 || button is not ("up" or "down")) return;
        if (!registry.Connections.TryGetValue(Context.ConnectionId, out var presence)) return;
        await service.ReadAsync(presence.DocumentId, presence.UserId, presence.Token, Context.ConnectionAborted);
        await Clients.OthersInGroup(Room(presence.DocumentId)).SendAsync("Cursor", new { id = Context.ConnectionId, username = presence.Name, pointer = new { x, y }, button }, Context.ConnectionAborted);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // Disconnect cleanup must complete after ConnectionAborted has been canceled.
        await LeavePreviousAsync(CancellationToken.None);
        await base.OnDisconnectedAsync(exception);
    }

    private async Task LeavePreviousAsync(CancellationToken cancellationToken)
    {
        if (!registry.Connections.TryRemove(Context.ConnectionId, out var previous)) return;
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, Room(previous.DocumentId), cancellationToken);
        await Clients.Group(Room(previous.DocumentId)).SendAsync("Left", Context.ConnectionId, cancellationToken);
        await PublishPresenceAsync(previous.DocumentId, cancellationToken);
    }

    private Task PublishPresenceAsync(Guid id, CancellationToken cancellationToken) => Clients.Group(Room(id)).SendAsync("Presence",
        registry.Connections.Values.Where(x => x.DocumentId == id).Select(x => new { id = x.ConnectionId, username = x.Name }).ToArray(), cancellationToken);

    public static void CheckOrigin(HttpContext http)
    {
        if (http.Request.Headers.Origin.Count > 0 && http.Request.Headers.Origin.ToString() != $"{http.Request.Scheme}://{http.Request.Host}")
            throw new UnauthorizedAccessException();
    }
}
