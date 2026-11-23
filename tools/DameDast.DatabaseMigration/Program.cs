using DameDast.DatabaseMigration;
using DameDast.Infrastructure;
using DameDast.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

if (args.Length != 1)
{
    Console.Error.WriteLine("Usage: dotnet run --project tools/DameDast.DatabaseMigration -- <path-to-damedast.db-or-poolo.db>\nSet ConnectionStrings__Finance to the destination PostgreSQL connection string. Stop the old app before importing.");
    return 1;
}

using var cancellation = new CancellationTokenSource();
Console.CancelKeyPress += (_, e) => { e.Cancel = true; cancellation.Cancel(); };
var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
{
    ["ConnectionStrings:Finance"] = Environment.GetEnvironmentVariable("ConnectionStrings__Finance")
}).Build();
await using var db = new FinanceDb(new DbContextOptionsBuilder<FinanceDb>()
    .UseNpgsql(PostgreSqlConfiguration.ReadConnectionString(configuration)).Options);
var counts = await SqliteImporter.ImportAsync(args[0], db, cancellation.Token);
foreach (var (table, count) in counts) Console.WriteLine($"{table}: {count} rows imported");
Console.WriteLine("Import committed. The SQLite source was kept unchanged.");
return 0;
