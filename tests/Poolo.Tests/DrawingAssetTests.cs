using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Poolo.Domain;
using Poolo.Application.Features.FinanceRecords.Models;
using Xunit;

namespace Poolo.Tests;

public sealed class DrawingAssetTests
{
    [Fact]
    public void DrawingRoundTripsAndRejectsNonFiniteGeometryAndUnsafeColors()
    {
        var element = new DrawingElement(Guid.NewGuid(), "pen", 10, 10, 0, 0, "#24785e", 3, [new(10, 10, .2), new(100, 120, .8)]);
        var drawing = new DrawingDocument(1, 1600, 1000, [element]);
        DrawingRules.Validate(drawing);
        Assert.Equal(.8, FinanceRules.Read<DrawingDocument>(JsonSerializer.SerializeToElement(drawing, FinanceRules.Json)).Elements[0].Points![1].Pressure);
        Assert.Throws<FinanceException>(() => DrawingRules.Validate(drawing with { Elements = [element with { X = double.NaN }] }));
        Assert.Throws<FinanceException>(() => DrawingRules.Validate(drawing with { Elements = [element with { Color = "url(https://example.com)" }] }));
        Assert.Throws<FinanceException>(() => DrawingRules.Validate(drawing with { Elements = [null!] }));
    }

    [Fact]
    public void OlderNoteEditorsCannotSilentlyEraseASavedDrawing()
    {
        var drawing = new DrawingDocument(1, 1600, 1000, []);
        var note = new PersonalNote("My canvas", "", false, new DateOnly(2026, 11, 16), Drawing: drawing);
        var change = Change("note", note);
        var first = FinanceRules.Apply([], change);
        var legacy = JsonSerializer.SerializeToElement(new { title = "Edited text", body = "New text", pinned = false, updatedOn = "2026-11-16" });
        var next = FinanceRules.Apply([first], change with { OperationId = Guid.NewGuid(), ExpectedVersion = 1, Data = legacy });
        Assert.NotNull(FinanceRules.Read<PersonalNote>(next.Data).Drawing);
        Assert.Equal("Edited text", FinanceRules.Read<PersonalNote>(next.Data).Title);
    }

    [Fact]
    public void AssetMathKeepsTinyQuantitiesAndNeverInfersAnUnknownCost()
    {
        var position = new AssetPosition("Bitcoin", null, "BTC", [new(Guid.NewGuid(), "0.000000000000000001", "10.50", new(2026, 11, 1))], []);
        AssetRules.Validate(position);
        Assert.Equal(.000000000000000001m, AssetRules.Number(position.Lots[0].Quantity, 18));
        var gain = AssetRules.Gain(position, new(2026, 11, 16), 21);
        Assert.Equal(10.50m, gain.ProfitToman);
        Assert.Equal(100, gain.ProfitPercent);
        var unknown = position with { Lots = [position.Lots[0] with { CostToman = null }] };
        AssetRules.Validate(unknown);
        Assert.Null(AssetRules.Gain(unknown, new(2026, 11, 16), 21).ProfitToman);
        Assert.Null(AssetRules.Gain(position with { Lots = [] }, new(2026, 11, 16), 21).ProfitToman);
        Assert.Null(AssetRules.Gain(position, new(2026, 11, 16), 21, 1).ProfitToman);
        Assert.Equal(-100, AssetRules.Gain(position, new(2026, 11, 16), 0).ProfitPercent);
    }

    [Fact]
    public async Task DrawingsAndAssetPositionsUseTheExistingAtomicAuthenticatedSync()
    {
        await using var app = new FinanceTests.TestApp();
        using var client = app.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-User", "alice");
        var session = await client.GetFromJsonAsync<JsonElement>("/api/session", CancellationToken.None);
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", session.GetProperty("csrf").GetString());
        var note = Change("note", new PersonalNote("Canvas", "", false, new(2026, 11, 16), Drawing: new(1, 1600, 1000, [])));
        var position = Change("assetPosition", new AssetPosition("Gold", null, "GOLD", [new(Guid.NewGuid(), "10", "100000000", new(2026, 11, 1))], [new(new(2026, 11, 16), "120000000")]));
        var response = await client.PostAsJsonAsync("/api/sync", new SyncRequest([note, position]), CancellationToken.None);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var gain = await client.GetFromJsonAsync<AssetGain>($"/api/assets/{position.Id}/performance", CancellationToken.None);
        Assert.Equal(20000000, gain!.ProfitToman);
        client.DefaultRequestHeaders.Remove("X-Test-User");
        client.DefaultRequestHeaders.Add("X-Test-User", "bob");
        Assert.Empty((await client.GetFromJsonAsync<Snapshot>("/api/finance", CancellationToken.None))!.Records);
    }

    [Fact]
    public async Task MissingGoogleKeysHaveAnExplicitStatusAndDoNotStartAFakeLogin()
    {
        await using var app = new FinanceTests.TestApp();
        using var client = app.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        var status = await client.GetFromJsonAsync<JsonElement>("/auth/google/status", CancellationToken.None);
        Assert.False(status.GetProperty("configured").GetBoolean());
        Assert.EndsWith("/signin-google", status.GetProperty("callbackUrl").GetString());
        Assert.Equal("/?authError=not-configured", (await client.GetAsync("/auth/google", CancellationToken.None)).Headers.Location!.ToString());
    }

    private static Mutation Change(string kind, object data) => new(Guid.NewGuid(), Guid.NewGuid(), kind, 0, false, JsonSerializer.SerializeToElement(data, FinanceRules.Json));
}
