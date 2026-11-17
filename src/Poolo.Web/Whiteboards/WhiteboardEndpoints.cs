using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.SignalR;
using Poolo.Application.Features.Whiteboards;
using Poolo.Application.Interfaces.Sessions;
using Poolo.Application.Interfaces.Whiteboards;
using Poolo.Domain;

namespace Poolo.Web.Whiteboards;

public static class WhiteboardEndpoints
{
    public static IEndpointRouteBuilder MapWhiteboards(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/whiteboards");
        group.AddEndpointFilter(async (context, next) =>
        {
            var http = context.HttpContext;
            WhiteboardHub.CheckOrigin(http);
            if (http.Features.Get<IHttpMaxRequestBodySizeFeature>() is { IsReadOnly: false } size) size.MaxRequestBodySize = 9_000_000;
            if (!HttpMethods.IsGet(http.Request.Method) && !HttpMethods.IsHead(http.Request.Method) && (string.IsNullOrEmpty(Token(http)) || http.Request.Path.Value!.EndsWith("/shares") || http.Request.Path.Value!.EndsWith("/library")))
                await http.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(http);
            return await next(context);
        });
        group.MapGet("/capabilities", (ICurrentUser user) => Results.Ok(new { storage = user.IsAuthenticated, collaboration = true, sharing = true, maximumBytes = WhiteboardRules.MaximumBytes }));
        group.MapGet("/library", async (ICurrentUser user, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetWhiteboardLibraryQuery(user.RequireId()), ct)));
        group.MapPut("/library", async (HttpContext http, ICurrentUser user, ISender sender, CancellationToken ct) =>
        {
            var input = await http.Request.ReadFromJsonAsync<JsonElement>(ct);
            return Results.Ok(await sender.Send(new SaveWhiteboardLibraryCommand(user.RequireId(), input), ct));
        });
        group.MapGet("/{id:guid}", async (Guid id, HttpContext http, ICurrentUser user, ISender sender, CancellationToken ct) =>
            Results.Ok(await sender.Send(new GetWhiteboardQuery(id, user.IsAuthenticated ? user.Id : null, Token(http)), ct)));
        group.MapPost("/{id:guid}", async (Guid id, HttpContext http, ICurrentUser user, ISender sender, IHubContext<WhiteboardHub> hub, CancellationToken ct) =>
        {
            var patch = await http.Request.ReadFromJsonAsync<WhiteboardPatch>(ct) ?? throw new FinanceException("Missing update.");
            var state = await sender.Send(new UpdateWhiteboardCommand(id, user.IsAuthenticated ? user.Id : null, Token(http), patch), ct);
            await hub.Clients.Group(WhiteboardHub.Room(id)).SendAsync("SceneChanged", state.Revision, ct);
            return Results.Ok(state);
        });
        group.MapPost("/{id:guid}/shares", async (Guid id, HttpContext http, ICurrentUser user, ISender sender, CancellationToken ct) =>
        {
            var input = await http.Request.ReadFromJsonAsync<ShareRequest>(ct) ?? throw new FinanceException("Choose a sharing role.");
            return Results.Ok(await sender.Send(new CreateWhiteboardShareCommand(id, user.RequireId(), input.Role), ct));
        });
        group.MapDelete("/{id:guid}/shares", async (Guid id, ICurrentUser user, ISender sender, IHubContext<WhiteboardHub> hub, WhiteboardPresenceRegistry registry, CancellationToken ct) =>
        {
            await sender.Send(new RevokeWhiteboardSharesCommand(id, user.RequireId()), ct);
            await hub.Clients.Group(WhiteboardHub.Room(id)).SendAsync("AccessChanged", ct);
            foreach (var presence in registry.Connections.Values.Where(p => p.DocumentId == id && p.UserId != user.RequireId()).ToArray())
            {
                registry.Connections.TryRemove(presence.ConnectionId, out _);
                await hub.Groups.RemoveFromGroupAsync(presence.ConnectionId, WhiteboardHub.Room(id), ct);
                await hub.Clients.Group(WhiteboardHub.Room(id)).SendAsync("Left", presence.ConnectionId, ct);
            }
            return Results.NoContent();
        });
        endpoints.MapHub<WhiteboardHub>("/hubs/whiteboard", options => options.CloseOnAuthenticationExpiration = true);
        return endpoints;
    }

    private static string? Token(HttpContext http) => http.Request.Headers["X-Whiteboard-Token"].FirstOrDefault();
    private sealed record ShareRequest(string Role);
}
