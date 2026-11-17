using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DameDast.Application.Features.FinanceRecords.Models;
using DameDast.Domain;
using DameDast.Application.Interfaces.Reminders;
using DameDast.Application.Services;
using Xunit;

namespace DameDast.Tests;

public sealed class PortfolioTests
{
    private static readonly DateTimeOffset Captured = new(2026, 11, 15, 12, 0, 0, TimeSpan.Zero);
    private static ExternalItem Asset(string key = "A") => new(key, key, Captured, "equity", key, "2", "100", null);
    private static ExternalSnapshot Source(IReadOnlyList<ExternalItem>? items = null) => new("damdast-portfolio-v1", "capture-1", "agah", "Personal", "Portfolio", "assets", Captured, "partial", items ?? [Asset()]);
    private static Mutation Change(ExternalSnapshot data, Guid? id = null, long version = 0) => new(Guid.NewGuid(), id ?? Guid.NewGuid(), "externalSnapshot", version, false, JsonSerializer.SerializeToElement(data, FinanceRules.Json));
    [Fact]
    public void SourceCannotBeDuplicatedOrReplacedByAnOlderCapture()
    {
        var first = FinanceRules.Apply([], Change(Source()));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([first], Change(Source())));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([first], Change(Source()with { CapturedAt = Captured.AddMinutes(-1) }, first.Id, 1)));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([first], Change(Source()with { Account = "Other" }, first.Id, 1)));
    }

    [Fact]
    public void DecimalStringsAndUniqueRowKeysAreEnforced()
    {
        foreach (var invalid in new[]
        {
            "-1",
            "1e8",
            "NaN",
            "1.234",
            "1۲"
        }

        )
            Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change(Source([Asset()with { ValueToman = invalid }]))));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change(Source([Asset(), Asset()]))));
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], Change(Source([Asset()with { LockedToman = "101" }]))));
        FinanceRules.Apply([], Change(Source([Asset()with { Quantity = "0.000000000000000001", ValueToman = null }])));
    }

    [Fact]
    public void UnknownInstallmentsDoNotTriggerReminders()
    {
        var item = new ExternalItem("loan", "Loan", Captured, AmountToman: "100", DueDate: new DateOnly(2026, 11, 16), Status: "unknown");
        var source = Source([item])with
        {
            Category = "installments",
            Provider = "digipay"
        };
        var row = FinanceRules.Apply([], Change(source));
        Assert.False(InstallmentReminderRules.HasImportedDue([row], new DateOnly(2026, 11, 15)));
        row = FinanceRules.Apply([], Change(source with { Items = [item with { Status = "unpaid" }] }));
        Assert.True(InstallmentReminderRules.HasImportedDue([row], new DateOnly(2026, 11, 15)));
        Assert.False(InstallmentReminderRules.HasImportedDue([row with { Deleted = true }], new DateOnly(2026, 11, 15)));
        Assert.False(InstallmentReminderRules.HasImportedDue([FinanceRules.Apply([], Change(source with { Items = [item with { Status = "paid" }] }))], new DateOnly(2026, 11, 15)));
    }

    [Fact]
    public async Task PortfolioApiRequiresAuthenticationCsrfAndIsolatesUsers()
    {
        await using var app = new FinanceTests.TestApp();
        using var client = app.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/portfolio", CancellationToken.None)).StatusCode);
        client.DefaultRequestHeaders.Add("X-Test-User", "alice");
        var input = new SyncRequest([Change(Source())]);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/portfolio/sync", input, CancellationToken.None)).StatusCode);
        var session = await client.GetFromJsonAsync<JsonElement>("/api/portfolio/session", CancellationToken.None);
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", session.GetProperty("csrf").GetString());
        var result = await client.PostAsJsonAsync("/api/portfolio/sync", input, CancellationToken.None);
        Assert.Equal(HttpStatusCode.OK, result.StatusCode);
        var snapshot = await result.Content.ReadFromJsonAsync<Snapshot>(CancellationToken.None);
        Assert.Single(snapshot!.Records);
        var retry = await client.PostAsJsonAsync("/api/portfolio/sync", input, CancellationToken.None);
        Assert.Equal(HttpStatusCode.OK, retry.StatusCode);
        var stale = await client.PostAsJsonAsync("/api/portfolio/sync", new SyncRequest([input.Changes[0] with { OperationId = Guid.NewGuid() }]), CancellationToken.None);
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        client.DefaultRequestHeaders.Remove("X-Test-User");
        client.DefaultRequestHeaders.Add("X-Test-User", "bob");
        Assert.Empty((await client.GetFromJsonAsync<Snapshot>("/api/portfolio", CancellationToken.None))!.Records);
    }

    [Fact]
    public void UnknownFieldsInSourceDataAreRejected()
    {
        var data = JsonSerializer.SerializeToElement(new { format = "damdast-portfolio-v1", cookie = "secret" });
        var change = new Mutation(Guid.NewGuid(), Guid.NewGuid(), "externalSnapshot", 0, false, data);
        Assert.Throws<FinanceException>(() => FinanceRules.Apply([], change));
    }
}
