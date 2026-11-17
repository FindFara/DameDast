using DameDast.Application.Features.Market.Models;

namespace DameDast.Application.Interfaces.Market;

public interface IMarketSampleRepository
{
    Task RecordAsync(IReadOnlyList<MarketQuote> quotes, CancellationToken cancellationToken);
    Task<IReadOnlyList<PricePoint>> ReadAsync(string symbol, long since, CancellationToken cancellationToken);
}
