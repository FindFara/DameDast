using System.Text.Json;

namespace DameDast.Application.Features.Market.Models;

public sealed record MarketInstrument(string Symbol, string Name, string NameFa, string Glyph, string Category,
    string Key, string Unit, decimal Divisor, string Provider, string? InsCode, string PriceKind, string SourceUrl);

public static class MarketCatalog
{
    public static IReadOnlyList<MarketInstrument> Instruments { get; } = Load();

    private static IReadOnlyList<MarketInstrument> Load()
    {
        using var stream = typeof(MarketCatalog).Assembly.GetManifestResourceStream(
            "DameDast.Application.Features.Market.market-catalog.json") ?? throw new InvalidOperationException("Missing market catalog.");
        return JsonSerializer.Deserialize<MarketInstrument[]>(stream, new JsonSerializerOptions(JsonSerializerDefaults.Web))
            ?? throw new InvalidOperationException("Invalid market catalog.");
    }
}
