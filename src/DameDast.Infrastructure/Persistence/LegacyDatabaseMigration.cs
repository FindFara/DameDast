using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;

namespace DameDast.Infrastructure.Persistence;

public static class LegacyDatabaseMigration
{
    public static async Task MigrateAsync(IConfiguration configuration, CancellationToken cancellationToken)
    {
        var configured = configuration.GetConnectionString("Finance");
        if (string.IsNullOrWhiteSpace(configured)) return;
        var destination = new SqliteConnectionStringBuilder(configured);
        if (!string.Equals(Path.GetFileName(destination.DataSource), "damedast.db", StringComparison.OrdinalIgnoreCase)) return;
        var oldPath = Path.Combine(Path.GetDirectoryName(destination.DataSource) ?? ".", "poolo.db");
        if (File.Exists(destination.DataSource) || !File.Exists(oldPath)) return;
        var temporary = destination.DataSource + ".import-" + Guid.NewGuid().ToString("N");
        try
        {
            await using (var source = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = oldPath, Mode = SqliteOpenMode.ReadOnly }.ToString()))
            await using (var target = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = temporary }.ToString()))
            {
                await source.OpenAsync(cancellationToken);
                await target.OpenAsync(cancellationToken);
                cancellationToken.ThrowIfCancellationRequested();
                source.BackupDatabase(target);
            }
            cancellationToken.ThrowIfCancellationRequested();
            try { File.Move(temporary, destination.DataSource, overwrite: false); }
            catch (IOException) when (File.Exists(destination.DataSource)) { }
        }
        finally
        {
            if (File.Exists(temporary)) File.Delete(temporary);
        }
    }
}
