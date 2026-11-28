using System.Globalization;
using System.Text.Json;
using DameDast.Domain;
using DameDast.Infrastructure;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Storage;

namespace DameDast.DatabaseMigration;

public static class SqliteImporter
{
    public static async Task<IReadOnlyDictionary<string, long>> ImportAsync(string sourcePath, FinanceDb destination, CancellationToken cancellationToken)
    {
        if (!File.Exists(sourcePath)) throw new FileNotFoundException("The legacy SQLite database was not found.", sourcePath);
        await using var source = new SqliteConnection(new SqliteConnectionStringBuilder
        {
            DataSource = Path.GetFullPath(sourcePath), Mode = SqliteOpenMode.ReadOnly, Pooling = false
        }.ToString());
        await source.OpenAsync(cancellationToken);
        await using var snapshot = source.BeginTransaction(deferred: true);
        var tables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        await using (var command = source.CreateCommand())
        {
            command.Transaction = snapshot;
            command.CommandText = "SELECT name FROM sqlite_master WHERE type = 'table'";
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken)) tables.Add(reader.GetString(0));
        }
        if (!tables.Contains("Ledgers")) throw new InvalidOperationException("The source is not a DameDast/Poolo ledger database.");

        await destination.Database.MigrateAsync(cancellationToken);
        await using var transaction = await destination.Database.BeginTransactionAsync(cancellationToken);
        var entities = destination.Model.GetEntityTypes()
            .OrderBy(x => x.ClrType == typeof(LedgerRow) ? 0 : x.ClrType == typeof(WhiteboardRow) ? 1 : 2)
            .ThenBy(x => x.GetTableName()).ToArray();
        // Keep all app writers out until the complete import has committed or rolled back.
        var names = string.Join(", ", entities.Select(x => Quote(x.GetTableName()!)));
        await using (var command = destination.Database.GetDbConnection().CreateCommand())
        {
            command.Transaction = transaction.GetDbTransaction();
            command.CommandText = $"LOCK TABLE {names} IN ACCESS EXCLUSIVE MODE";
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        foreach (var entity in entities)
        {
            await using var command = destination.Database.GetDbConnection().CreateCommand();
            command.Transaction = transaction.GetDbTransaction();
            // Built-in roles are migration seed data, not an existing user's destination data.
            var predicate = entity.ClrType == typeof(AppRole) ? " WHERE NOT \"IsSystem\" OR \"Name\" NOT IN ('Admin', 'User')" : "";
            command.CommandText = $"SELECT EXISTS (SELECT 1 FROM {Quote(entity.GetTableName()!)}{predicate})";
            if ((bool)(await command.ExecuteScalarAsync(cancellationToken))!)
                throw new InvalidOperationException("Import requires an empty PostgreSQL destination. Existing data was kept unchanged.");
        }

        var counts = new Dictionary<string, long> { ["FinanceRecords"] = 0 };
        // These tables did not exist in the legacy SQLite format; populate the directory after import.
        foreach (var entity in entities.Where(x => x.ClrType != typeof(AppRole) && x.ClrType != typeof(AppUser)
            && x.ClrType != typeof(AppUserRole) && x.ClrType != typeof(PageViewDaily)))
        {
            var table = entity.GetTableName()!;
            if (!tables.Contains(table)) { counts.TryAdd(table, 0); continue; }
            await using var command = source.CreateCommand();
            command.Transaction = snapshot;
            command.CommandText = $"SELECT * FROM {Quote(table)}";
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            var columns = Enumerable.Range(0, reader.FieldCount).ToDictionary(reader.GetName, StringComparer.OrdinalIgnoreCase);
            long count = 0;
            while (await reader.ReadAsync(cancellationToken))
            {
                var row = Activator.CreateInstance(entity.ClrType)!;
                foreach (var property in entity.GetProperties())
                {
                    var column = property.GetColumnName(StoreObjectIdentifier.Table(table, entity.GetSchema()))!;
                    if (!columns.TryGetValue(column, out var ordinal))
                    {
                        // Keep defaults for push settings introduced after the first SQLite deployments.
                        if (entity.ClrType == typeof(DeviceSubscription) && property.Name is nameof(DeviceSubscription.Language)
                            or nameof(DeviceSubscription.RemindersEnabled) or nameof(DeviceSubscription.InstallmentsEnabled)) continue;
                        throw new InvalidOperationException($"Missing source column {table}.{column}.");
                    }
                    property.PropertyInfo!.SetValue(row, ConvertValue(reader.GetValue(ordinal), property.ClrType));
                }
                if (row is LedgerRow ledger)
                {
                    var state = reader.GetString(columns["State"]);
                    var records = JsonSerializer.Deserialize<List<FinanceRecord>>(state, FinanceRules.Json)
                        ?? throw new InvalidOperationException("The legacy ledger has no valid record array.");
                    ledger.Records = records.Select((record, index) => new FinanceRecordRow
                    {
                        UserId = ledger.UserId, Id = record.Id, Kind = record.Kind, Version = record.Version,
                        Deleted = record.Deleted, SortOrder = index,
                        Data = record.Data.ValueKind == JsonValueKind.Undefined ? "null" : record.Data.GetRawText()
                    }).ToList();
                    counts["FinanceRecords"] += ledger.Records.Count;
                }
                destination.Add(row);
                count++;
                if (count % 500 == 0)
                {
                    await destination.SaveChangesAsync(cancellationToken);
                    destination.ChangeTracker.Clear();
                }
            }
            await destination.SaveChangesAsync(cancellationToken);
            destination.ChangeTracker.Clear();
            counts[table] = count;
        }
        await destination.Database.ExecuteSqlRawAsync("""
            INSERT INTO "Users" ("Id", "Name", "Email", "IsActive", "CreatedAt", "LastSeenAt")
            SELECT "Id", left("Id", 200), NULL, TRUE, CURRENT_TIMESTAMP, NULL FROM (
                SELECT "UserId" AS "Id" FROM "Ledgers"
                UNION SELECT "UserId" FROM "Subscriptions"
                UNION SELECT "UserId" FROM "WhiteboardLibraries"
                UNION SELECT "OwnerId" FROM "Whiteboards"
            ) AS owners WHERE length("Id") > 0;
            INSERT INTO "UserRoles" ("UserId", "RoleName") SELECT "Id", 'User' FROM "Users";
            """, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return counts;
    }

    private static object? ConvertValue(object value, Type type)
    {
        if (value is DBNull) return null;
        if (type == typeof(Guid)) return Guid.Parse((string)value);
        if (type == typeof(DateTimeOffset)) return DateTimeOffset.Parse((string)value, CultureInfo.InvariantCulture).ToUniversalTime();
        return Convert.ChangeType(value, type, CultureInfo.InvariantCulture);
    }

    private static string Quote(string identifier) => "\"" + identifier.Replace("\"", "\"\"") + "\"";
}
