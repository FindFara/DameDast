using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using DameDast.Infrastructure;
using DameDast.Infrastructure.Persistence.Repositories;
using DameDast.Infrastructure.Services.Market;
using DameDast.Infrastructure.Services.Benchmarks;
using Xunit;
using System.Text.Json;
using DameDast.Domain;

namespace DameDast.Tests;

public sealed class UpgradeTests
{
    [Fact]
    public async Task StructuredRecordsMigrationAndRollbackPreserveRecordsReceiptsAndOrdering()
    {
        await using var database = new PostgreSqlTestDatabase();
        await using var db = database.CreateDbContext();
        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync("Whiteboards");
        var records = new[]
        {
            new FinanceRecord(Guid.NewGuid(), "account", 2, true, JsonSerializer.SerializeToElement(new Wallet("قدیمی", 100, "teal"), FinanceRules.Json)),
            new FinanceRecord(Guid.NewGuid(), "account", 1, false, JsonSerializer.SerializeToElement(new Wallet("فعال", 200, "blue"), FinanceRules.Json))
        };
        var state = JsonSerializer.Serialize(records, FinanceRules.Json);
        var timestamp = DateTimeOffset.UtcNow;
        var operation = Guid.NewGuid();
        await db.Database.ExecuteSqlInterpolatedAsync($"""INSERT INTO "Ledgers" ("UserId", "Revision", "State", "UpdatedAt") VALUES ('alice', 3, {state}, {timestamp})""");
        await db.Database.ExecuteSqlInterpolatedAsync($"""INSERT INTO "Receipts" ("UserId", "OperationId", "Payload") VALUES ('alice', {operation}, 'exact request')""");
        for (var pass = 0; pass < 2; pass++)
        {
            await migrator.MigrateAsync();
            var snapshot = await new FinanceRepository(database, TimeProvider.System).ReadAsync("alice", CancellationToken.None);
            Assert.Equal(3, snapshot.Revision);
            Assert.Equal(records.Select(x => x.Id), snapshot.Records.Select(x => x.Id));
            Assert.True(snapshot.Records[0].Deleted);
            Assert.Equal("قدیمی", FinanceRules.Read<Wallet>(snapshot.Records[0].Data).Name);
            Assert.Equal("exact request", (await db.Receipts.AsNoTracking().SingleAsync()).Payload);
            if (pass == 0) await migrator.MigrateAsync("Whiteboards");
        }
    }

    [Fact]
    public async Task LanguageMigrationPreservesExistingPushSubscriptions()
    {
        await using var database = new PostgreSqlTestDatabase();
        {
            await using var db = database.CreateDbContext();
            var previousName = db.GetService<IMigrationsIdGenerator>().GetName("20261115000200_RemindersAndMarkets");
            await db.GetService<IMigrator>().MigrateAsync(previousName, CancellationToken.None);
            await db.Database.ExecuteSqlRawAsync("""INSERT INTO "Subscriptions" ("Id", "UserId", "Endpoint", "P256dh", "Auth") VALUES ('device', 'user', 'https://fcm.googleapis.com/test', 'public-key', 'auth-key')""", CancellationToken.None);
            await db.Database.MigrateAsync(CancellationToken.None);
            var subscription = await db.Subscriptions.SingleAsync(CancellationToken.None);
            Assert.Equal("en", subscription.Language);
            Assert.Equal("public-key", subscription.P256dh);
            Assert.Equal("auth-key", subscription.Auth);
        }
    }
}
