using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DameDast.Application.Features.FinanceRecords.Models;
using DameDast.Domain;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Hosting;
using Xunit;

namespace DameDast.Tests;

public sealed class AccountIsolationTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task DemoFlagComesFromServerConfigurationAndSessionIsNeverCached(bool enabled)
    {
        await using var original = new FinanceTests.TestApp();
        await using var app = original.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?> { ["Features:DemoData"] = enabled.ToString() })));
        using var client = app.CreateClient();
        var response = await client.GetAsync("/api/session");
        var session = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(enabled, session.GetProperty("demoEnabled").GetBoolean());
        Assert.False(session.GetProperty("authenticated").GetBoolean());
        Assert.True(response.Headers.CacheControl?.NoStore);
        Assert.False(session.TryGetProperty("googleMissingSettings", out _));
    }

    [Fact]
    public async Task UsersHaveIndependentNotesAndStaleAccountRequestsCannotReadOrWriteTheNewAccount()
    {
        await using var app = new FinanceTests.TestApp();
        using var alice = app.CreateClient(); using var bob = app.CreateClient();
        alice.DefaultRequestHeaders.Add("X-Test-User", "alice"); bob.DefaultRequestHeaders.Add("X-Test-User", "bob");
        foreach (var client in new[] { alice, bob })
        {
            var session = await client.GetFromJsonAsync<JsonElement>("/api/session");
            client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", session.GetProperty("csrf").GetString());
        }
        var id = Guid.NewGuid();
        Mutation Note(string title) => new(Guid.NewGuid(), id, "note", 0, false,
            JsonSerializer.SerializeToElement(new { title, body = "Private text", pinned = false, color = "", updatedOn = "2026-11-18" }, FinanceRules.Json));
        var aliceNote = Note("Alice note");
        Assert.Equal(HttpStatusCode.OK, (await alice.PostAsJsonAsync("/api/sync", new SyncRequest([aliceNote]))).StatusCode);
        Assert.Empty((await bob.GetFromJsonAsync<Snapshot>("/api/finance"))!.Records);
        bob.DefaultRequestHeaders.Add("X-DameDast-User", "alice");
        Assert.Equal(HttpStatusCode.Unauthorized, (await bob.GetAsync("/api/finance")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await bob.PostAsJsonAsync("/api/sync", new SyncRequest([aliceNote]))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await bob.GetAsync("/api/portfolio")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await bob.GetAsync("/api/whiteboards/capabilities")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await bob.PostAsync("/hubs/whiteboard/negotiate?negotiateVersion=1", null)).StatusCode);
        bob.DefaultRequestHeaders.Remove("X-DameDast-User"); bob.DefaultRequestHeaders.Add("X-DameDast-User", "bob");
        Assert.Empty((await bob.GetFromJsonAsync<Snapshot>("/api/finance"))!.Records);
        Assert.Equal(HttpStatusCode.OK, (await bob.PostAsJsonAsync("/api/sync", new SyncRequest([Note("Bob note")]))).StatusCode);
        Assert.Equal("Alice note", (await alice.GetFromJsonAsync<Snapshot>("/api/finance"))!.Records.Single().Data.GetProperty("title").GetString());
        Assert.Equal("Bob note", (await bob.GetFromJsonAsync<Snapshot>("/api/finance"))!.Records.Single().Data.GetProperty("title").GetString());
    }
}
