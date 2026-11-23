using System.Text.Json;
using DameDast.Application.Features.Market.Models;
using DameDast.Application.Features.Reminders.Models;
using DameDast.Domain;
using DameDast.Infrastructure.Persistence;
using DameDast.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace DameDast.Tests;

public sealed class PostgreSqlTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Data Source=data/damedast.db;Default Timeout=10")]
    [InlineData("Host=localhost;Password=do-not-expose")]
    public void InvalidConfigurationFailsWithoutExposingCredentials(string? connectionString)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        { ["ConnectionStrings:Finance"] = connectionString }).Build();
        var error = Assert.Throws<InvalidOperationException>(() => PostgreSqlConfiguration.ReadConnectionString(config));
        Assert.Contains("PostgreSQL", error.Message);
        Assert.DoesNotContain("do-not-expose", error.ToString());
    }

    [Fact]
    public async Task ConcurrentFirstLedgerWritesPreserveEveryIndependentRecord()
    {
        await using var database = new PostgreSqlTestDatabase();
        await using var db = database.CreateDbContext();
        await db.Database.MigrateAsync();
        var repository = new FinanceRepository(database, TimeProvider.System);
        var changes = Enumerable.Range(0, 4).Select(i => new Mutation(Guid.NewGuid(), Guid.NewGuid(), "account", 0, false,
            JsonSerializer.SerializeToElement(new Wallet("account " + i, 100, "teal"), FinanceRules.Json))).ToArray();
        await Task.WhenAll(changes.Select(change => repository.ApplyAsync("alice", [change], CancellationToken.None)));
        Assert.Equal(4, (await repository.ReadAsync("alice", CancellationToken.None)).Records.Count);
        Assert.Equal(4, await db.Receipts.CountAsync());
    }

    [Fact]
    public async Task DuplicateMarketObservationsAndReminderReceiptsAreSafeAcrossConnections()
    {
        await using var database = new PostgreSqlTestDatabase();
        await using var db = database.CreateDbContext();
        await db.Database.MigrateAsync();
        var market = new MarketSampleRepository(database);
        var reminders = new ReminderReceiptRepository(database);
        var timestamp = DateTimeOffset.FromUnixTimeSeconds(1_800_000_000);
        var quote = new MarketQuote("gold", "Gold", 123456789.123456789m, "toman", null, timestamp, "test");
        await Task.WhenAll(Enumerable.Range(0, 4).Select(_ => market.RecordAsync([quote, quote], CancellationToken.None)));
        await Task.WhenAll(Enumerable.Range(0, 4).Select(_ => reminders.RecordAsync("receipt", timestamp.ToOffset(TimeSpan.FromHours(3.5)), CancellationToken.None)));
        var sample = Assert.Single(await market.ReadAsync("gold", 0, CancellationToken.None));
        Assert.Equal(quote.Price, sample.Price);
        Assert.Equal(timestamp.ToUnixTimeSeconds(), sample.Timestamp);
        Assert.Equal(timestamp, (await db.ReminderReceipts.SingleAsync()).SentAt);
    }

    [Fact]
    public async Task ConcurrentPushRegistrationUsesOneRowAndCanBeRemovedByItsOwner()
    {
        await using var database = new PostgreSqlTestDatabase();
        await using var db = database.CreateDbContext();
        await db.Database.MigrateAsync();
        var repository = new PushSubscriptionRepository(database);
        var registration = new PushRegistration("https://fcm.googleapis.com/test", new("public", "auth"), "fa");
        await Task.WhenAll(Enumerable.Range(0, 4).Select(_ => repository.UpsertAsync("alice", registration, CancellationToken.None)));
        Assert.Equal("fa", Assert.Single(await repository.ReadAllAsync(CancellationToken.None)).Language);
        await repository.RemoveAsync("bob", registration.Endpoint, CancellationToken.None);
        Assert.Single(await repository.ReadAllAsync(CancellationToken.None));
        await repository.RemoveAsync("alice", registration.Endpoint, CancellationToken.None);
        Assert.Empty(await repository.ReadAllAsync(CancellationToken.None));
    }
}
