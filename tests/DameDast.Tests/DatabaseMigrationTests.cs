using DameDast.DatabaseMigration;
using DameDast.Infrastructure;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DameDast.Tests;

public sealed class DatabaseMigrationTests
{
    [Fact]
    public async Task ImportsEveryLegacyTableWithoutChangingTheSourceAndRefusesANonemptyDestination()
    {
        await using var database = new PostgreSqlTestDatabase();
        await using var db = database.CreateDbContext();
        var path = Path.GetTempFileName();
        var documentId = Guid.NewGuid();
        var operationId = Guid.NewGuid();
        try
        {
            await CreateSourceAsync(path, documentId, operationId);
            var original = await File.ReadAllBytesAsync(path);
            var counts = await SqliteImporter.ImportAsync(path, db, CancellationToken.None);
            Assert.Equal(10, counts.Count);
            Assert.All(counts.Values, count => Assert.Equal(1, count));
            var ledger = await db.Ledgers.SingleAsync();
            var record = await db.FinanceRecords.SingleAsync();
            Assert.Equal("یادداشت", JsonSerializer.Deserialize<JsonElement>(record.Data).GetProperty("title").GetString());
            Assert.Equal("note", record.Kind);
            Assert.Equal(3, ledger.Revision);
            Assert.Equal(TimeSpan.Zero, ledger.UpdatedAt.Offset);
            Assert.Equal(operationId, (await db.Receipts.SingleAsync()).OperationId);
            Assert.Equal("en", (await db.Subscriptions.SingleAsync()).Language);
            Assert.Equal(TimeSpan.Zero, (await db.ReminderReceipts.SingleAsync()).SentAt.Offset);
            var price = await db.MarketSamples.SingleAsync();
            Assert.Equal(1_800_000_000L, price.Timestamp);
            Assert.Equal(123456789.123456789m, price.Price);
            Assert.Equal(documentId, (await db.Whiteboards.SingleAsync()).Id);
            Assert.Equal(operationId, (await db.WhiteboardOperations.SingleAsync()).OperationId);
            Assert.True((await db.WhiteboardShares.SingleAsync()).Revoked);
            Assert.Equal("جزء", JsonSerializer.Deserialize<JsonElement>((await db.WhiteboardLibraries.SingleAsync()).Items)[0].GetProperty("name").GetString());
            await Assert.ThrowsAsync<InvalidOperationException>(() => SqliteImporter.ImportAsync(path, db, CancellationToken.None));
            Assert.Single(await db.Ledgers.ToListAsync());
            Assert.Equal(original, await File.ReadAllBytesAsync(path));
        }
        finally { File.Delete(path); }
    }

    [Fact]
    public async Task InvalidSourceRollsBackAllImportedRows()
    {
        await using var database = new PostgreSqlTestDatabase();
        await using var db = database.CreateDbContext();
        var path = Path.GetTempFileName();
        try
        {
            await CreateSourceAsync(path, Guid.NewGuid(), Guid.NewGuid());
            await using (var source = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = path, Pooling = false }.ToString()))
            {
                await source.OpenAsync();
                await using var command = source.CreateCommand();
                command.CommandText = "UPDATE WhiteboardShares SET Id='invalid-guid'";
                await command.ExecuteNonQueryAsync();
            }
            await Assert.ThrowsAsync<FormatException>(() => SqliteImporter.ImportAsync(path, db, CancellationToken.None));
            Assert.Empty(await db.Ledgers.ToListAsync());
            Assert.Empty(await db.MarketSamples.ToListAsync());
            Assert.Empty(await db.Receipts.ToListAsync());
            Assert.Empty(await db.Subscriptions.ToListAsync());
            Assert.Empty(await db.Whiteboards.ToListAsync());
        }
        finally { File.Delete(path); }
    }

    private static async Task CreateSourceAsync(string path, Guid documentId, Guid operationId)
    {
        await using var source = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = path, Pooling = false }.ToString());
        await source.OpenAsync();
        await using var command = source.CreateCommand();
        command.CommandText = """
            CREATE TABLE Ledgers (UserId TEXT PRIMARY KEY, Revision INTEGER, State TEXT, UpdatedAt TEXT);
            INSERT INTO Ledgers VALUES ('alice', 3, '[{"id":"11111111-1111-1111-1111-111111111111","kind":"note","version":1,"deleted":false,"data":{"title":"یادداشت"}}]', '2026-11-22 10:30:00+03:30');
            CREATE TABLE Receipts (UserId TEXT, OperationId TEXT, Payload TEXT);
            INSERT INTO Receipts VALUES ('alice', $operation, '{"data":"preserved"}');
            CREATE TABLE Subscriptions (Id TEXT, UserId TEXT, Endpoint TEXT, P256dh TEXT, Auth TEXT);
            INSERT INTO Subscriptions VALUES ('device', 'alice', 'https://fcm.googleapis.com/test', 'public', 'auth');
            CREATE TABLE ReminderReceipts (Key TEXT, SentAt TEXT);
            INSERT INTO ReminderReceipts VALUES ('receipt', '2026-11-22 10:30:00+03:30');
            CREATE TABLE MarketSamples (Symbol TEXT, Timestamp INTEGER, Price TEXT);
            INSERT INTO MarketSamples VALUES ('gold', 1800000000, '123456789.123456789');
            CREATE TABLE Whiteboards (Id TEXT, OwnerId TEXT, Revision INTEGER, State TEXT, UpdatedAt INTEGER);
            INSERT INTO Whiteboards VALUES ($document, 'alice', 2, '{"revision":2}', 1800000000000);
            CREATE TABLE WhiteboardOperations (DocumentId TEXT, OperationId TEXT, Digest TEXT);
            INSERT INTO WhiteboardOperations VALUES ($document, $operation, 'digest');
            CREATE TABLE WhiteboardShares (Id TEXT, DocumentId TEXT, TokenHash TEXT, Role TEXT, ExpiresAt INTEGER, Revoked INTEGER);
            INSERT INTO WhiteboardShares VALUES ($document, $document, 'hash', 'view', 1800000000000, 1);
            CREATE TABLE WhiteboardLibraries (UserId TEXT, Revision INTEGER, Items TEXT);
            INSERT INTO WhiteboardLibraries VALUES ('alice', 1, '[{"name":"جزء"}]');
            """;
        command.Parameters.AddWithValue("$document", documentId.ToString());
        command.Parameters.AddWithValue("$operation", operationId.ToString());
        await command.ExecuteNonQueryAsync();
    }
}
