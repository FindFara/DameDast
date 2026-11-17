namespace Poolo.Application.Features.Market.Models;

public sealed record MarketQuote(string Symbol, string Name, decimal Price, string Unit, decimal? ChangePercent, DateTimeOffset AsOf, string Source, string? Category = null, string PriceKind = "spot");
public sealed record PricePoint(long Timestamp, decimal Price);
public sealed record MarketSnapshot(IReadOnlyList<MarketQuote> Quotes, bool Stale, DateTimeOffset? FetchedAt, string? Error, IReadOnlyDictionary<string, string>? Issues = null, IReadOnlyList<MarketInstrument>? Instruments = null);
