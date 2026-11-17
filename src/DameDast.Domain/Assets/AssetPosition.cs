using System.Globalization;

namespace DameDast.Domain;

public sealed record AssetPosition(string Name, string? SourceKey, string? MarketSymbol, IReadOnlyList<AssetLot> Lots,
    IReadOnlyList<AssetValuation> Valuations);
public sealed record AssetLot(Guid Id, string Quantity, string? CostToman, DateOnly BoughtOn);
public sealed record AssetValuation(DateOnly Date, string ValueToman);
public sealed record AssetGain(decimal Quantity, decimal CostToman, decimal? ValueToman, decimal? ProfitToman,
    decimal? ProfitPercent, string Status);

public static class AssetRules
{
    public static void Validate(AssetPosition position)
    {
        if (string.IsNullOrWhiteSpace(position.Name) || position.Name.Length > 80 || position.Name != position.Name.Trim()
            || position.SourceKey is { Length: > 600 } || position.MarketSymbol is { Length: > 24 }
            || position.Lots is null || position.Lots.Count > 100 || position.Lots.Any(x => x is null) || position.Lots.Select(x => x.Id).Distinct().Count() != position.Lots.Count
            || position.Valuations is null || position.Valuations.Count > 1000 || position.Valuations.Any(x => x is null) || position.Valuations.Select(x => x.Date).Distinct().Count() != position.Valuations.Count)
            throw new FinanceException("Invalid asset position.");
        foreach (var lot in position.Lots)
            if (lot.Id == Guid.Empty || Number(lot.Quantity, 18) <= 0 || Number(lot.Quantity, 18) > 1_000_000_000
                || lot.CostToman is not null && Number(lot.CostToman, 2) > 1_000_000_000_000 || lot.BoughtOn.Year is < 2000 or > 2100)
                throw new FinanceException("Enter valid open purchases.");
        foreach (var valuation in position.Valuations)
            if (Number(valuation.ValueToman, 2) > 1_000_000_000_000 || valuation.Date.Year is < 2000 or > 2100)
                throw new FinanceException("Enter a valid asset valuation.");
        if (position.Lots.Sum(x => Number(x.Quantity, 18)) > 1_000_000_000
            || position.Lots.Sum(x => x.CostToman is null ? 0 : Number(x.CostToman, 2)) > 1_000_000_000_000)
            throw new FinanceException("Asset position exceeds the supported amount.");
    }

    public static decimal Number(string? text, int scale)
    {
        if (text is null || !System.Text.RegularExpressions.Regex.IsMatch(text, "^(0|[1-9][0-9]{0,11})(\\.[0-9]{1," + scale + "})?$")
            || !decimal.TryParse(text, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out var value))
            throw new FinanceException("Invalid asset amount or quantity.");
        return value;
    }

    public static AssetGain Gain(AssetPosition position, DateOnly asOf, decimal? value, decimal? observedQuantity = null)
    {
        var lots = position.Lots.Where(x => x.BoughtOn <= asOf).ToArray();
        var quantity = lots.Sum(x => Number(x.Quantity, 18));
        var cost = lots.Sum(x => x.CostToman is null ? 0 : Number(x.CostToman, 2));
        var status = lots.Length == 0 || lots.Any(x => x.CostToman is null) ? "missing-cost" : observedQuantity.HasValue && observedQuantity != quantity ? "quantity-changed"
            : !value.HasValue ? "missing-value" : "ready";
        var gain = status == "ready" ? value - cost : null;
        return new(quantity, cost, value, gain, gain.HasValue && cost > 0 ? gain / cost * 100 : null, status);
    }
}
