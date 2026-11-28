using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DameDast.Domain;
using DameDast.Application.Features.FinanceRecords.Models;
using Xunit;

namespace DameDast.Tests;

public sealed class AssetTypeTests
{
    private static Mutation Change(Guid id, string kind, long version, object data) => new(Guid.NewGuid(), id, kind, version, false, JsonSerializer.SerializeToElement(data, FinanceRules.Json));
    [Fact]
    public void ClassificationChangesKeepVersionIdentityAndDetailsAndRejectUnrelatedTypes()
    {
        var id = Guid.NewGuid();
        var original = FinanceRules.Apply([], Change(id,"receivable",0,new Receivable("Person",200,50,new(2026,11,28),null,"note")));
        var converted = FinanceRules.Apply([original],Change(id,"locked",1,new LockedAsset("Deposit",150,null,"note")));
        Assert.Equal(id,converted.Id); Assert.Equal(2,converted.Version);
        Assert.Equal(50,converted.Data.GetProperty("assetTypeData").GetProperty("receivable").GetProperty("returned").GetInt32());
        var edit = FinanceRules.Apply([converted],Change(id,"locked",2,new LockedAsset("Edited",150,null,"note")));
        Assert.True(edit.Data.GetProperty("assetTypeData").TryGetProperty("receivable",out _));
        Assert.Throws<ConflictException>(()=>FinanceRules.Apply([edit],Change(id,"receivable",1,new Receivable("Person",200,50,new(2026,11,28),null,"note"))));
        Assert.Throws<FinanceException>(()=>FinanceRules.Apply([edit],Change(id,"account",3,new Wallet("Account",0,"teal"))));
        var restored = FinanceRules.Apply([edit],Change(id,"receivable",3,new Receivable("Person",200,50,new(2026,11,28),null,"note")));
        Assert.Equal(4,restored.Version); Assert.Equal(50,restored.Data.GetProperty("returned").GetInt32());
        Assert.Equal("Edited",restored.Data.GetProperty("assetTypeData").GetProperty("locked").GetProperty("name").GetString());
    }
    [Fact]
    public async Task AssetConversionSyncIsAtomicAndKeepsPurchaseHistoryWithoutAccountMovements()
    {
        await using var app = new FinanceTests.TestApp(); using var client = app.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-User","asset-owner");
        var session=await client.GetFromJsonAsync<JsonElement>("/api/session");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN",session.GetProperty("csrf").GetString());
        var id=Guid.NewGuid();
        var position=new AssetPosition("Personal asset",null,null,[new(Guid.NewGuid(),"1","100",new(2026,11,28))],[new(new(2026,11,28),"150")]);
        Assert.Equal(HttpStatusCode.OK,(await client.PostAsJsonAsync("/api/sync",new SyncRequest([Change(id,"assetPosition",0,position)]))).StatusCode);
        var response=await client.PostAsJsonAsync("/api/sync",new SyncRequest([Change(id,"locked",1,new LockedAsset("Personal asset",150,null,""))]));
        Assert.Equal(HttpStatusCode.OK,response.StatusCode);
        var record=Assert.Single((await response.Content.ReadFromJsonAsync<Snapshot>())!.Records);
        Assert.Equal("locked",record.Kind); Assert.Equal(id,record.Id);
        Assert.Equal("100",record.Data.GetProperty("assetTypeData").GetProperty("assetPosition").GetProperty("lots")[0].GetProperty("costToman").GetString());
        var invalid=await client.PostAsJsonAsync("/api/sync",new SyncRequest([Change(id,"receivable",2,new Receivable("Person",100,101,new(2026,11,28),null,""))]));
        Assert.Equal(HttpStatusCode.BadRequest,invalid.StatusCode);
        var snapshot=(await client.GetFromJsonAsync<Snapshot>("/api/finance"))!;
        Assert.Equal("locked",Assert.Single(snapshot.Records).Kind); Assert.Equal(2,snapshot.Records[0].Version);
    }
}
