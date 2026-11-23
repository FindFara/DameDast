using DameDast.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace DameDast.Tests;

// Each fixture owns a separate real PostgreSQL database, including HTTP fixtures.
internal sealed class PostgreSqlTestDatabase : IDbContextFactory<FinanceDb>, IAsyncDisposable
{
    private readonly string databaseName = "damedast_test_" + Guid.NewGuid().ToString("N");
    private readonly string adminConnectionString;
    public string ConnectionString { get; }

    public PostgreSqlTestDatabase()
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("DAMEDAST_TEST_POSTGRES")
            ?? "Host=localhost;Port=5432;Database=postgres;Username=damedast;Password=damedast-local;Timeout=5")
        { Database = "postgres", Pooling = false };
        adminConnectionString = settings.ConnectionString;
        using var admin = new NpgsqlConnection(adminConnectionString);
        admin.Open();
        using var command = admin.CreateCommand();
        command.CommandText = $"CREATE DATABASE \"{databaseName}\"";
        command.ExecuteNonQuery();
        settings.Database = databaseName;
        ConnectionString = settings.ConnectionString;
    }

    public FinanceDb CreateDbContext() => new(new DbContextOptionsBuilder<FinanceDb>().UseNpgsql(ConnectionString).Options);

    public async ValueTask DisposeAsync()
    {
        await using var admin = new NpgsqlConnection(adminConnectionString);
        await admin.OpenAsync();
        await using var command = admin.CreateCommand();
        command.CommandText = $"DROP DATABASE \"{databaseName}\" WITH (FORCE)";
        await command.ExecuteNonQueryAsync();
    }
}
