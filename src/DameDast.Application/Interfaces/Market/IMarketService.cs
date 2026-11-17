using DameDast.Application.Features.Market.Models;

namespace DameDast.Application.Interfaces.Market;

public interface IMarketService
{
    Task<MarketSnapshot> ReadAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<PricePoint>> HistoryAsync(string symbol, int days, CancellationToken cancellationToken);
}
