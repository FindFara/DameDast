using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Poolo.Application.Features.FinanceRecords.Models;
using Poolo.Application.Features.Workbench.Queries;
using Poolo.Application.Features.Workbench.Models;
using Poolo.Domain;
using Xunit;

namespace Poolo.Tests;

public sealed class WorkbenchTests
{
    [Fact]
    public void GridBoundsColorsAndNonOverlappingCellsAreEnforced()
    {
        var card = Card();
        WorkbenchRules.Validate(Layout(card with { Width = 12, Height = 6 }));
        foreach (var invalid in new[] { card with { X = -1 }, card with { Y = 6 }, card with { Width = 0 },
            card with { Width = 13 }, card with { X = int.MaxValue }, card with { Background = "url(https://evil.test)" },
            card with { Id = Guid.Empty }, card with { Type = "unknown" } })
            Assert.Throws<FinanceException>(() => WorkbenchRules.Validate(Layout(invalid)));
        Assert.Throws<FinanceException>(() => WorkbenchRules.Validate(Layout(card, card with { Id = Guid.NewGuid() })));
        Assert.Throws<FinanceException>(() => WorkbenchRules.Validate(Layout(null!)));
        Assert.Throws<FinanceException>(() => WorkbenchRules.Validate(Layout() with { Rows = 7 }));
    }

    [Fact]
    public void OnlyOneActiveDeskPerUserAndStaleVersionsAreRejected()
    {
        var change = Change("workbench", Layout(Card()));
        var saved = FinanceRules.Apply([], change);
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([saved], Change("workbench", Layout())));
        Assert.Throws<ConflictException>(() => FinanceRules.Apply([saved], change with { OperationId = Guid.NewGuid() }));
        var updated = FinanceRules.Apply([saved], change with { OperationId = Guid.NewGuid(), ExpectedVersion = 1,
            Data = JsonSerializer.SerializeToElement(Layout() with { Background = "#182b2d" }, FinanceRules.Json) });
        Assert.Empty(FinanceRules.Read<WorkbenchLayout>(updated.Data).Widgets);
    }

    [Fact]
    public async Task WorkbenchUsesAuthenticatedAtomicSyncAndRemovingCardsKeepsNotes()
    {
        await using var app = new FinanceTests.TestApp();
        using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/workbench", CancellationToken.None)).StatusCode);
        client.DefaultRequestHeaders.Add("X-Test-User", "alice");
        var note = Change("note", new PersonalNote("My note", "Keep this", false, new(2026, 11, 16)));
        var card = Card() with { ReferenceId = note.Id, Background = "#e3eeea" };
        var desk = Change("workbench", Layout(card));
        var input = new SyncRequest([note, desk]);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/sync", input, CancellationToken.None)).StatusCode);
        var session = await client.GetFromJsonAsync<JsonElement>("/api/session", CancellationToken.None);
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", session.GetProperty("csrf").GetString());
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/sync", input, CancellationToken.None)).StatusCode);
        var saved = await client.GetFromJsonAsync<WorkbenchOverview>("/api/workbench", CancellationToken.None);
        Assert.Equal(note.Id, FinanceRules.Read<WorkbenchLayout>(saved!.Record!.Data).Widgets[0].ReferenceId);
        var removeCard = desk with { OperationId = Guid.NewGuid(), ExpectedVersion = 1, Data = JsonSerializer.SerializeToElement(Layout(), FinanceRules.Json) };
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/sync", new SyncRequest([removeCard]), CancellationToken.None)).StatusCode);
        var all = await client.GetFromJsonAsync<Snapshot>("/api/finance", CancellationToken.None);
        Assert.Single(all!.Records, r => r.Id == note.Id && !r.Deleted);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/sync", new SyncRequest([removeCard with { OperationId = Guid.NewGuid() }]), CancellationToken.None)).StatusCode);
        client.DefaultRequestHeaders.Remove("X-Test-User");client.DefaultRequestHeaders.Add("X-Test-User", "bob");
        Assert.Null((await client.GetFromJsonAsync<WorkbenchOverview>("/api/workbench", CancellationToken.None))!.Record);
    }

    private static WorkbenchWidget Card() => new(Guid.NewGuid(), "notes", 0, 0, 4, 2);
    private static WorkbenchLayout Layout(params WorkbenchWidget[] widgets) => new(1, 12, 6, null, widgets);
    private static Mutation Change(string kind, object data) => new(Guid.NewGuid(), Guid.NewGuid(), kind, 0, false,
        JsonSerializer.SerializeToElement(data, FinanceRules.Json));
}
