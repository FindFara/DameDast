using Poolo.Application.Features.Market.Models;

namespace Poolo.Application.Interfaces.Market;

public interface IMarketSampleRepository
{
    Task RecordAsync(IReadOnlyList<MarketQuote> quotes, CancellationToken cancellationToken);
    Task<IReadOnlyList<PricePoint>> ReadAsync(string symbol, long since, CancellationToken cancellationToken);
}
