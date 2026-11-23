using Microsoft.EntityFrameworkCore;
using DameDast.Application.Interfaces.FinanceRecords;
using DameDast.Application.Interfaces.Market;
using DameDast.Application.Interfaces.Reminders;
using DameDast.Application.Features.Market.Models;

namespace DameDast.Infrastructure.Persistence.Repositories;

public sealed class MarketSampleRepository(IDbContextFactory<FinanceDb> factory) : IMarketSampleRepository
{
    public async Task RecordAsync(IReadOnlyList<MarketQuote> quotes, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        foreach (var quote in quotes)
        {
            var stamp = quote.AsOf.ToUnixTimeSeconds();
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "MarketSamples" ("Symbol", "Timestamp", "Price")
                VALUES ({quote.Symbol}, {stamp}, {quote.Price})
                ON CONFLICT ("Symbol", "Timestamp") DO NOTHING
                """, cancellationToken);
        }

    }

    public async Task<IReadOnlyList<PricePoint>> ReadAsync(string symbol, long since, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        return await db.MarketSamples.AsNoTracking().Where(x => x.Symbol == symbol && x.Timestamp >= since).OrderBy(x => x.Timestamp).Select(x => new PricePoint(x.Timestamp, x.Price)).ToListAsync(cancellationToken);
    }
}
