using System.Text.Json;
using Poolo.Application.Features.Market.Models;
using Poolo.Infrastructure.Services.Market;
using Xunit;

namespace Poolo.Tests;

public sealed class ExpandedMarketTests
{
    [Fact]
    public void CatalogKeepsDistinctSymbolsAndExplicitUnitsAndProviders()
    {
        var instruments = MarketCatalog.Instruments;
        Assert.Equal(39, instruments.Count);
        Assert.Equal(39, instruments.DistinctBy(x => x.Symbol).Count());
        Assert.Equal(5, instruments.DistinctBy(x => x.Category).Count());
        Assert.Equal("USD / tonne", instruments.Single(x => x.Symbol == "COPPER").Unit);
        Assert.Equal("crypto-toncoin-irr", instruments.Single(x => x.Symbol == "TON").Key);
        Assert.Equal("nav", instruments.Single(x => x.Symbol == "MORVARID").PriceKind);
    }

    [Fact]
    public void StockClosingQuotePreservesSourceDateAndDoesNotQuoteUntradedDays()
    {
        var instrument = MarketCatalog.Instruments.Single(x => x.Symbol == "AGAS");
        using var json = JsonDocument.Parse("""{"closingPriceInfo":{"dEven":20261116,"hEven":122257,"pClosing":603502,"priceYesterday":600000,"zTotTran":3617}}""");
        var quote = MarketService.ParseTsetmcQuote(json.RootElement, instrument)!;
        Assert.Equal(60350.2m, quote.Price);
        Assert.Equal("close", quote.PriceKind);
        Assert.Equal(new DateTimeOffset(2026, 11, 16, 12, 22, 57, TimeSpan.FromHours(3.5)), quote.AsOf);
        using var untraded = JsonDocument.Parse("""{"closingPriceInfo":{"dEven":20261116,"pClosing":603502,"priceYesterday":600000,"zTotTran":0}}""");
        Assert.Null(MarketService.ParseTsetmcQuote(untraded.RootElement, instrument));
    }

    [Fact]
    public void FundNavNeedsAnExplicitCurrencyAndDateAndIsNeverAPercentReturn()
    {
        var instrument = MarketCatalog.Instruments.Single(x => x.Symbol == "MORVARID");
        using var json = JsonDocument.Parse("""[{"regNo":"12015","currency":"IRR","cancelNav":31000,"date":"2026-11-16"}]""");
        var quote = MarketService.ParseOfficialNav(json.RootElement, instrument)!;
        Assert.Equal(3100, quote.Price);
        Assert.Null(quote.ChangePercent);
        Assert.Equal("nav", quote.PriceKind);
        using var unknownUnit = JsonDocument.Parse("""[{"regNo":"12015","cancelNav":31000,"date":"2026-11-16"}]""");
        Assert.Null(MarketService.ParseOfficialNav(unknownUnit.RootElement, instrument));
    }
}
