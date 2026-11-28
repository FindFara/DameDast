using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DameDast.Application.Features.FinanceRecords.Models;
using DameDast.Application.Features.Workbench.Queries;
using DameDast.Application.Features.Workbench.Models;
using DameDast.Domain;
using Xunit;

namespace DameDast.Tests;

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
        var search = Card() with { Type="search", X=4, Width=8, Height=1, ReferenceId=null };
        var shortcut = Card() with { Type="shortcut", X=4, Y=1, Width=1, Height=1, ReferenceId=null, Options=new(Page:"calendar") };
        var standard = new WorkbenchLayout(2,12,6,null,[card,search,shortcut]);
        var migrate = desk with { OperationId=Guid.NewGuid(), ExpectedVersion=1, Data=JsonSerializer.SerializeToElement(standard,FinanceRules.Json) };
        Assert.Equal(HttpStatusCode.OK,(await client.PostAsJsonAsync("/api/sync",new SyncRequest([migrate]),CancellationToken.None)).StatusCode);
        var upgraded = await client.GetFromJsonAsync<WorkbenchOverview>("/api/workbench",CancellationToken.None);
        Assert.Equal(2,FinanceRules.Read<WorkbenchLayout>(upgraded!.Record!.Data).Version);
        var forged = migrate with {OperationId=Guid.NewGuid(),ExpectedVersion=2,Data=JsonSerializer.SerializeToElement(standard with {Widgets=[card,search,shortcut with {Width=2}]},FinanceRules.Json)};
        Assert.Equal(HttpStatusCode.BadRequest,(await client.PostAsJsonAsync("/api/sync",new SyncRequest([forged]),CancellationToken.None)).StatusCode);
        var fine = new WorkbenchLayout(3,24,12,null,[card with {Width=8,Height=4},search with {X=8,Width=16,Height=2},shortcut with {X=8,Y=2}]);
        var fineChange = desk with { OperationId=Guid.NewGuid(),ExpectedVersion=2,Data=JsonSerializer.SerializeToElement(fine,FinanceRules.Json) };
        Assert.Equal(HttpStatusCode.OK,(await client.PostAsJsonAsync("/api/sync",new SyncRequest([fineChange]),CancellationToken.None)).StatusCode);
        var resize = fineChange with {OperationId=Guid.NewGuid(),ExpectedVersion=3,Data=JsonSerializer.SerializeToElement(fine with {Widgets=[fine.Widgets[0] with {Width=6,Height=3},fine.Widgets[1],fine.Widgets[2]]},FinanceRules.Json)};
        Assert.Equal(HttpStatusCode.OK,(await client.PostAsJsonAsync("/api/sync",new SyncRequest([resize]),CancellationToken.None)).StatusCode);
        var resized = await client.GetFromJsonAsync<WorkbenchOverview>("/api/workbench",CancellationToken.None);
        Assert.Equal(6,FinanceRules.Read<WorkbenchLayout>(resized!.Record!.Data).Widgets[0].Width);
        var removeCard = desk with { OperationId = Guid.NewGuid(), ExpectedVersion = 4, Data = JsonSerializer.SerializeToElement(new WorkbenchLayout(3,24,12,null,[]), FinanceRules.Json) };
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/sync", new SyncRequest([removeCard]), CancellationToken.None)).StatusCode);
        var all = await client.GetFromJsonAsync<Snapshot>("/api/finance", CancellationToken.None);
        Assert.Single(all!.Records, r => r.Id == note.Id && !r.Deleted);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/sync", new SyncRequest([removeCard with { OperationId = Guid.NewGuid() }]), CancellationToken.None)).StatusCode);
        client.DefaultRequestHeaders.Remove("X-Test-User");client.DefaultRequestHeaders.Add("X-Test-User", "bob");
        Assert.Null((await client.GetFromJsonAsync<WorkbenchOverview>("/api/workbench", CancellationToken.None))!.Record);
    }

    [Fact]
    public void NewComponentsValidateOptionsAndRoundTripWithoutChangingOldCards()
    {
        var cases = new (string Type, WorkbenchWidgetOptions Options)[]
        {
            ("markets", new(Symbols: "BTC,GOLD,SILVER,USD")), ("clock", new(ClockStyle: "analog", TimeZone: "Asia/Tehran")), ("search", new()), ("googleServices", new()), ("shortcut", new(Page: "notes")),
            ("pet", new(PetStyle: "cat")), ("pet", new(PetStyle: "dog")), ("plainCalendar", new(Calendar: "persian")),
            ("link", new(Url: "https://example.com/path", Description: "A useful site")),
            ("calculator", new()), ("keyGenerator", new()),
            ("image", new(ImageData: "data:image/png;base64,iVBORw0KGgo="))
        };
        foreach (var (type, options) in cases)
        {
            var card = Card() with { Type = type, ReferenceId = null, Options = options };
            var saved = FinanceRules.Apply([], Change("workbench", Layout(card)));
            Assert.Equal(options, FinanceRules.Read<WorkbenchLayout>(saved.Data).Widgets[0].Options);
        }
        WorkbenchRules.Validate(Layout(Card()));
    }

    [Fact]
    public void ImageAndLinkLimitsAreEnforcedByTheServer()
    {
        var invalid = new (string Type, WorkbenchWidgetOptions Options)[]
        {
            ("link", new(Url: "javascript:alert(1)")), ("link", new(Url: "file:///tmp/x")),
            ("link", new(Url: "https://user:pass@example.com")), ("link", new(Url: "https://example.com\n/path")),
            ("image", new(ImageData: "data:image/svg+xml;base64,PHN2Zz4=")),
            ("image", new(ImageData: "data:image/png;base64,YmFk")),
            ("image", new(ImageData: "data:image/png;base64,iVBORw0K Ggo=")),
            ("image", new(ImageData: "data:image/png;base64," + new string('A', 120000))),
            ("markets", new(Symbols: "BTC,BTC")), ("markets", new(Symbols: "INVALID")), ("notes", new(Symbols: "USD")), ("clock", new(ClockStyle: "unknown")), ("clock", new(TimeZone: "not-a-zone")),
            ("shortcut", new(Page: "javascript:alert(1)")), ("clock", new(Page: "notes")), ("pet", new(PetStyle: "unknown")), ("notes", new(Url: "https://example.com")),
            ("notes", new()), ("clock", new() { AdditionalProperties = new() { ["unexpected"] = JsonSerializer.SerializeToElement("value") } })
        };
        foreach (var (type, options) in invalid)
            Assert.Throws<FinanceException>(() => WorkbenchRules.Validate(Layout(Card() with { Type = type, Options = options })));
        var photos = Enumerable.Range(0, 5).Select(x => Card() with { Type = "image", Id = Guid.NewGuid(), X = x, Width = 1, Height = 1 }).ToArray();
        WorkbenchRules.Validate(Layout(photos[..4]));
        Assert.Throws<FinanceException>(() => WorkbenchRules.Validate(Layout(photos)));
    }

    [Fact]
    public void StandardLayoutsLockComponentDimensionsWhileOlderLayoutsRemainReadable()
    {
        var shortcut = Card() with { Type="shortcut",Width=1,Height=1,Options=new(Page:"notes") };
        var layout = new WorkbenchLayout(2,12,6,null,[shortcut]);
        WorkbenchRules.Validate(layout);
        Assert.Throws<FinanceException>(()=>WorkbenchRules.Validate(layout with {Widgets=[shortcut with {Width=2}]}));
        var search = shortcut with {Type="search",Width=8,Options=null};
        WorkbenchRules.Validate(layout with {Widgets=[search]});
        Assert.Throws<FinanceException>(()=>WorkbenchRules.Validate(layout with {Widgets=[search with {Height=2}]}));
        var older = new WorkbenchLayout(1,12,6,null,[Card() with {Width=2,Height=1}]);
        WorkbenchRules.Validate(older);
        WorkbenchRules.Validate(layout with {Rows=12,Widgets=[shortcut with {Y=11}]});
        Assert.Throws<FinanceException>(()=>WorkbenchRules.Validate(layout with {Rows=73}));
    }

    [Fact]
    public void FineGridDimensionsAreEditableWithinBoundsAndOldVersionsStayValid()
    {
        var card = Card() with {Width=8,Height=4};
        var layout = new WorkbenchLayout(3,24,12,null,[card]);
        WorkbenchRules.Validate(layout);
        WorkbenchRules.Validate(layout with {Widgets=[card with {Width=7,Height=5}]});
        WorkbenchRules.Validate(layout with {Rows=864,Widgets=[card with {Y=860}]});
        foreach(var invalid in new[]{card with {Width=25},card with {Height=13},card with {Width=0},card with {X=20}})
            Assert.Throws<FinanceException>(()=>WorkbenchRules.Validate(layout with {Widgets=[invalid]}));
        Assert.Throws<FinanceException>(()=>WorkbenchRules.Validate(layout with {Columns=12}));
        Assert.Throws<FinanceException>(()=>WorkbenchRules.Validate(layout with {Rows=865}));
    }

    private static WorkbenchWidget Card() => new(Guid.NewGuid(), "notes", 0, 0, 4, 2);
    private static WorkbenchLayout Layout(params WorkbenchWidget[] widgets) => new(1, 12, 6, null, widgets);
    private static Mutation Change(string kind, object data) => new(Guid.NewGuid(), Guid.NewGuid(), kind, 0, false,
        JsonSerializer.SerializeToElement(data, FinanceRules.Json));
}
