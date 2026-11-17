using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Poolo.Infrastructure;
using Poolo.Infrastructure.Persistence.Repositories;
using Poolo.Infrastructure.Services.Market;
using Poolo.Infrastructure.Services.Benchmarks;
using Xunit;

namespace Poolo.Tests;

public sealed class UpgradeTests
{
    [Fact]
    public async Task LanguageMigrationPreservesExistingPushSubscriptions()
    {
        var path = Path.GetTempFileName();
        try
        {
            await using var db = new FinanceDb(new DbContextOptionsBuilder<FinanceDb>().UseSqlite($"Data Source={path}").Options);
            var previousName = db.GetService<IMigrationsIdGenerator>().GetName("202611150002_RemindersAndMarkets");
            await db.GetService<IMigrator>().MigrateAsync(previousName, CancellationToken.None);
            await db.Database.ExecuteSqlRawAsync("INSERT INTO Subscriptions (Id, UserId, Endpoint, P256dh, Auth) VALUES ('device', 'user', 'https://fcm.googleapis.com/test', 'public-key', 'auth-key')", CancellationToken.None);
            await db.Database.MigrateAsync(CancellationToken.None);
            var subscription = await db.Subscriptions.SingleAsync(CancellationToken.None);
            Assert.Equal("en", subscription.Language);
            Assert.Equal("public-key", subscription.P256dh);
            Assert.Equal("auth-key", subscription.Auth);
        }
        finally
        {
            File.Delete(path);
        }
    }
}
