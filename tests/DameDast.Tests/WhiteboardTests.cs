using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;
using DameDast.Domain;
using Xunit;

namespace DameDast.Tests;

public sealed class WhiteboardTests
{
    [Fact]
    public void IndependentElementVersionsMergeAndUndoDoesNotReplaceOtherElements()
    {
        var initial = WhiteboardRules.Apply(WhiteboardState.Empty, Patch(Change("a", 0, 0), Change("b", 0, 0)));
        var a = WhiteboardRules.Apply(initial, Patch(Change("a", 1, 10)));
        var b = WhiteboardRules.Apply(a, Patch(Change("b", 1, 40)));
        Assert.Equal(10, X(b, "a")); Assert.Equal(40, X(b, "b"));
        var undo = WhiteboardRules.Apply(b, Patch(Change("a", 2, 0)));
        Assert.Equal(0, X(undo, "a")); Assert.Equal(40, X(undo, "b"));
        var conflict = Assert.Throws<WhiteboardConflictException>(() => WhiteboardRules.Apply(undo, Patch(Change("a", 1, 99))));
        Assert.Contains("a", conflict.ElementIds); Assert.Equal(40, X(conflict.State, "b"));
    }

    [Fact]
    public void UnsafeGeometryImagesAndLinksAreRejectedAtomically()
    {
        var valid = Change("a", 0, 0);
        var unsafeElement = JsonSerializer.SerializeToElement(new { id = "x", type = "rectangle", x = 0, y = 0, width = 10, height = 10, angle = 0, link = "javascript:alert(1)" });
        Assert.Throws<FinanceException>(() => WhiteboardRules.Apply(WhiteboardState.Empty, Patch(valid, new("x", 0, unsafeElement))));
        Assert.Empty(WhiteboardState.Empty.Scene.Elements);
        var image = JsonSerializer.SerializeToElement(new { id = "evil", mimeType = "image/svg+xml", dataURL = "data:image/svg+xml;base64,PHN2Zz4=" });
        Assert.Throws<FinanceException>(() => WhiteboardRules.Apply(WhiteboardState.Empty, Patch(valid) with { Files = new Dictionary<string, JsonElement> { ["evil"] = image } }));
    }

    [Fact]
    public async Task MinimalApiRequiresCsrfAndCapabilitiesRespectReadOnlyAndRevocation()
    {
        await using var app = new FinanceTests.TestApp(); using var owner = app.CreateClient();
        owner.DefaultRequestHeaders.Add("X-Test-User", "alice"); var id = Guid.NewGuid(); var patch = Patch(Change("a", 0, 0));
        Assert.Equal(HttpStatusCode.BadRequest, (await owner.PostAsJsonAsync($"/api/whiteboards/{id}", patch, CancellationToken.None)).StatusCode);
        await Session(owner);
        Assert.Equal(HttpStatusCode.OK, (await owner.PostAsJsonAsync($"/api/whiteboards/{id}", patch, CancellationToken.None)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await owner.PostAsJsonAsync($"/api/whiteboards/{id}", patch, CancellationToken.None)).StatusCode);
        var grant = await (await owner.PostAsJsonAsync($"/api/whiteboards/{id}/shares", new { role = "view" }, CancellationToken.None)).Content.ReadFromJsonAsync<WhiteboardGrant>(CancellationToken.None);
        using var guest = app.CreateClient(); guest.DefaultRequestHeaders.Add("X-Whiteboard-Token", grant!.Token);
        Assert.Equal("view", (await guest.GetFromJsonAsync<WhiteboardAccess>($"/api/whiteboards/{id}", CancellationToken.None))!.Role);
        Assert.Equal(HttpStatusCode.Unauthorized, (await guest.PostAsJsonAsync($"/api/whiteboards/{id}", Patch(Change("a", 1, 20)), CancellationToken.None)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await owner.DeleteAsync($"/api/whiteboards/{id}/shares", CancellationToken.None)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await guest.GetAsync($"/api/whiteboards/{id}", CancellationToken.None)).StatusCode);
    }

    [Fact]
    public async Task TwoSignalRClientsReconnectMergeIndependentOfflineChangesAndKeepRemoteWorkAfterUndo()
    {
        await using var app = new FinanceTests.TestApp();using var owner = app.CreateClient();owner.DefaultRequestHeaders.Add("X-Test-User", "alice");
        var (csrf, cookies) = await Session(owner);var id = Guid.NewGuid();
        Assert.Equal(HttpStatusCode.OK, (await owner.PostAsJsonAsync($"/api/whiteboards/{id}", Patch(Change("a", 0, 0), Change("b", 0, 0)), CancellationToken.None)).StatusCode);
        var grant = await (await owner.PostAsJsonAsync($"/api/whiteboards/{id}/shares", new { role = "edit" }, CancellationToken.None)).Content.ReadFromJsonAsync<WhiteboardGrant>(CancellationToken.None);
        await using var a = new HubConnectionBuilder().WithUrl(new Uri(owner.BaseAddress!, "/hubs/whiteboard"), options => { options.Transports = HttpTransportType.LongPolling;options.HttpMessageHandlerFactory = _ => app.Server.CreateHandler();options.Headers["X-Test-User"] = "alice";options.Headers["Cookie"] = cookies; }).Build();
        await using var b = new HubConnectionBuilder().WithUrl(new Uri(owner.BaseAddress!, "/hubs/whiteboard"), options => { options.Transports = HttpTransportType.LongPolling;options.HttpMessageHandlerFactory = _ => app.Server.CreateHandler(); }).Build();
        await a.StartAsync(CancellationToken.None);await b.StartAsync(CancellationToken.None);
        await a.InvokeAsync<WhiteboardAccess>("Join", id, null, "Alice", csrf, CancellationToken.None);
        await b.InvokeAsync<WhiteboardAccess>("Join", id, grant!.Token, "Guest", null, CancellationToken.None);
        var cursor = new TaskCompletionSource<JsonElement>(TaskCreationOptions.RunContinuationsAsynchronously);b.On<JsonElement>("Cursor", value => cursor.TrySetResult(value));
        await a.InvokeAsync("Cursor", 12d, 13d, "up", CancellationToken.None);
        Assert.Equal(12, (await cursor.Task.WaitAsync(TimeSpan.FromSeconds(5))).GetProperty("pointer").GetProperty("x").GetDouble());
        await b.StopAsync(CancellationToken.None);
        Assert.Equal(HttpStatusCode.OK, (await owner.PostAsJsonAsync($"/api/whiteboards/{id}", Patch(Change("a", 1, 10)), CancellationToken.None)).StatusCode);
        await b.StartAsync(CancellationToken.None);
        var joined = await b.InvokeAsync<WhiteboardAccess>("Join", id, grant.Token, "Guest", null, CancellationToken.None);
        Assert.Equal(10, X(joined.State, "a"));
        using var peer = app.CreateClient();peer.DefaultRequestHeaders.Add("X-Whiteboard-Token", grant.Token);
        Assert.Equal(HttpStatusCode.OK, (await peer.PostAsJsonAsync($"/api/whiteboards/{id}", Patch(Change("b", 1, 40)), CancellationToken.None)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await owner.PostAsJsonAsync($"/api/whiteboards/{id}", Patch(Change("a", 2, 0)), CancellationToken.None)).StatusCode);
        var final = await owner.GetFromJsonAsync<WhiteboardAccess>($"/api/whiteboards/{id}", CancellationToken.None);
        Assert.Equal(0, X(final!.State, "a"));Assert.Equal(40, X(final.State, "b"));
    }

    private static double X(WhiteboardState state, string id) => state.Scene.Elements.Single(e => e.GetProperty("id").GetString() == id).GetProperty("x").GetDouble();
    private static WhiteboardElementChange Change(string id, long expected, double x) => new(id, expected, JsonSerializer.SerializeToElement(new { id, type = "rectangle", x, y = 0, width = 100, height = 80, angle = 0, strokeColor = "#333333", backgroundColor = "transparent", version = 1 }));
    private static WhiteboardPatch Patch(params WhiteboardElementChange[] changes) => new(Guid.NewGuid(), changes);
    private static async Task<(string Csrf, string Cookies)> Session(HttpClient client)
    {
        using var response = await client.GetAsync("/api/session", CancellationToken.None);
        var data = await response.Content.ReadFromJsonAsync<JsonElement>(CancellationToken.None);var csrf = data.GetProperty("csrf").GetString()!;
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", csrf);
        return (csrf, string.Join("; ", response.Headers.GetValues("Set-Cookie").Select(cookie => cookie.Split(';')[0])));
    }
}
