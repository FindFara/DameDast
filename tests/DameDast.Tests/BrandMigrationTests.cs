using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using DameDast.Infrastructure.Persistence;
using Xunit;

namespace DameDast.Tests;

public sealed class BrandMigrationTests
{
    [Fact]
    public async Task Existing_database_is_copied_once_and_original_is_preserved()
    {
        var directory = Path.Combine(Path.GetTempPath(), "damedast-upgrade-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        try
        {
            var oldPath = Path.Combine(directory, "poolo.db");
            var newPath = Path.Combine(directory, "damedast.db");
            await using (var old = new SqliteConnection("Data Source=" + oldPath))
            {
                await old.OpenAsync();
                await using var command = old.CreateCommand();
                command.CommandText = "CREATE TABLE SavedNotes(Text TEXT); INSERT INTO SavedNotes VALUES ('kept');";
                await command.ExecuteNonQueryAsync();
            }
            var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>
            { ["ConnectionStrings:Finance"] = "Data Source=" + newPath }).Build();
            await LegacyDatabaseMigration.MigrateAsync(configuration, CancellationToken.None);
            Assert.True(File.Exists(oldPath));
            await using (var current = new SqliteConnection("Data Source=" + newPath))
            {
                await current.OpenAsync();
                await using var command = current.CreateCommand();
                command.CommandText = "SELECT Text FROM SavedNotes";
                Assert.Equal("kept", await command.ExecuteScalarAsync());
                command.CommandText = "UPDATE SavedNotes SET Text='newer'";
                await command.ExecuteNonQueryAsync();
            }
            await LegacyDatabaseMigration.MigrateAsync(configuration, CancellationToken.None);
            await using var final = new SqliteConnection("Data Source=" + newPath);
            await final.OpenAsync();
            await using var verify = final.CreateCommand();
            verify.CommandText = "SELECT Text FROM SavedNotes";
            Assert.Equal("newer", await verify.ExecuteScalarAsync());
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            Directory.Delete(directory, recursive: true);
        }
    }
}
