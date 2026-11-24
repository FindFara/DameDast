using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
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
    public async Task CanvasWritesAndCollaborationAreRetiredAndLegacyExportRequiresTheOwner()
    {
        await using var app = new FinanceTests.TestApp();
        using var owner = app.CreateClient(); owner.DefaultRequestHeaders.Add("X-Test-User", "alice");
        var id = Guid.NewGuid();
        Assert.Equal(HttpStatusCode.Gone, (await owner.PostAsJsonAsync($"/api/whiteboards/{id}", Patch(Change("a", 0, 0)), CancellationToken.None)).StatusCode);
        Assert.Equal(HttpStatusCode.Gone, (await owner.GetAsync("/hubs/whiteboard/negotiate", CancellationToken.None)).StatusCode);
        using var scope = app.Services.CreateScope();
        var store = scope.ServiceProvider.GetRequiredService<DameDast.Application.Interfaces.Whiteboards.IWhiteboardRepository>();
        await store.ApplyAsync(id, "alice", null, Patch(Change("a", 0, 12)), CancellationToken.None);
        var exported = await owner.GetFromJsonAsync<WhiteboardAccess>($"/api/legacy/whiteboards/{id}", CancellationToken.None);
        Assert.Equal(12, X(exported!.State, "a"));
        using var guest = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await guest.GetAsync($"/api/legacy/whiteboards/{id}", CancellationToken.None)).StatusCode);
        guest.DefaultRequestHeaders.Add("X-Test-User", "bob");
        Assert.Equal(HttpStatusCode.Unauthorized, (await guest.GetAsync($"/api/legacy/whiteboards/{id}", CancellationToken.None)).StatusCode);
    }

    private static double X(WhiteboardState state, string id) => state.Scene.Elements.Single(e => e.GetProperty("id").GetString() == id).GetProperty("x").GetDouble();
    private static WhiteboardElementChange Change(string id, long expected, double x) => new(id, expected, JsonSerializer.SerializeToElement(new { id, type = "rectangle", x, y = 0, width = 100, height = 80, angle = 0, strokeColor = "#333333", backgroundColor = "transparent", version = 1 }));
    private static WhiteboardPatch Patch(params WhiteboardElementChange[] changes) => new(Guid.NewGuid(), changes);
}
