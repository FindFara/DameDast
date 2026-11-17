using System.Globalization;
using System.Text.Json;
using DameDast.Application.Features.Market.Models;
using DameDast.Application.Interfaces.Market;
using DameDast.Common;

namespace DameDast.Infrastructure.Services.Market;

public sealed class MarketService(HttpClient http, IMarketSampleRepository samples, TimeProvider clock) : IMarketService
{
    private readonly SemaphoreSlim gate = new(1, 1);
    private readonly SemaphoreSlim providerSlots = new(4, 4);
    private MarketSnapshot cached = new([], true, null, "Prices have not loaded yet.");
    private DateTimeOffset lastAttempt;
    private readonly Dictionary<string, (DateTimeOffset FetchedAt, IReadOnlyList<PricePoint> Points)> histories = [];
    public static IReadOnlyList<MarketInstrument> Instruments => MarketCatalog.Instruments;

    public async Task<MarketSnapshot> ReadAsync(CancellationToken cancellationToken)
    {
        await gate.WaitAsync(cancellationToken);
        try
        {
            if (clock.UtcNow() - lastAttempt < TimeSpan.FromMinutes(cached.Issues?.Count > 0 || cached.Error is not null ? 1 : 5))
                return cached with { Stale = IsStale(cached) };
            lastAttempt = clock.UtcNow();
            using var budget = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            budget.CancelAfter(TimeSpan.FromSeconds(18));
            var token = budget.Token;
            var tasks = Instruments.Where(x => x.Provider == "tsetmc").Select(async instrument =>
            {
                try
                {
                    await providerSlots.WaitAsync(token);
                    try
                    {
                        using var data = await ReadJsonAsync($"https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceInfo/{instrument.InsCode}", token);
                        return ParseTsetmcQuote(data.RootElement, instrument);
                    }
                    finally { providerSlots.Release(); }
                }
                catch (Exception error) when (ProviderFailure(error, cancellationToken)) { return null; }
            }).ToArray();
            var tgju = ReadTgjuAsync(token, cancellationToken);
            var nav = ReadNavAsync(token, cancellationToken);
            var stockQuotes = await Task.WhenAll(tasks);
            var current = (await tgju).Concat(stockQuotes.OfType<MarketQuote>()).Concat(await nav).ToArray();
            cancellationToken.ThrowIfCancellationRequested();
            var issues = Instruments.Where(i => !current.Any(q => q.Symbol == i.Symbol))
                .ToDictionary(i => i.Symbol, i => i.Provider == "fund-nav" ? "Official NAV unavailable" : "Provider unavailable");
            var merged = cached.Quotes.ToDictionary(q => q.Symbol);
            foreach (var quote in current) merged[quote.Symbol] = quote;
            if (current.Length > 0) await samples.RecordAsync(current, cancellationToken);
            cached = new(merged.Values.ToArray(), false, clock.UtcNow(), current.Length == 0 ? "Market feed unavailable" : null,
                issues, Instruments);
            return cached with { Stale = IsStale(cached) };
        }
        finally { gate.Release(); }
    }

    public async Task<IReadOnlyList<PricePoint>> HistoryAsync(string symbol, int days, CancellationToken cancellationToken)
    {
        var instrument = Instruments.FirstOrDefault(x => x.Symbol == symbol);
        if (instrument is null || days is not (1 or 7 or 30)) return [];
        var since = clock.UtcNow().AddDays(-days).ToUnixTimeSeconds();
        IReadOnlyList<PricePoint> archive = [];
        await gate.WaitAsync(cancellationToken);
        try
        {
            if (days > 1 && instrument.Provider != "fund-nav")
            {
                if (histories.TryGetValue(symbol, out var previous) && clock.UtcNow() - previous.FetchedAt < TimeSpan.FromHours(6)) archive = previous.Points;
                else
                {
                    try
                    {
                        var url = instrument.Provider == "tsetmc"
                            ? $"https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceDailyList/{instrument.InsCode}/0"
                            : $"https://api.tgju.org/v1/market/indicator/summary-table-data/{instrument.Key}";
                        using var json = await ReadJsonAsync(url, cancellationToken);
                        archive = instrument.Provider == "tsetmc" ? ParseTsetmcHistory(json.RootElement, instrument.Divisor)
                            : ParseHistory(json.RootElement, instrument.Divisor, clock.UtcNow().AddDays(-35));
                        histories[symbol] = (clock.UtcNow(), archive);
                    }
                    catch (Exception error) when (ProviderFailure(error, cancellationToken)) { archive = previous.Points ?? []; }
                }
            }
        }
        finally { gate.Release(); }
        var observed = await samples.ReadAsync(symbol, since, cancellationToken);
        var merged = archive.Concat(observed).Where(x => x.Timestamp >= since && x.Timestamp <= clock.UtcNow().ToUnixTimeSeconds()).OrderBy(x => x.Timestamp);
        return days == 1 ? merged.DistinctBy(x => x.Timestamp).ToArray() : merged.GroupBy(x => x.Timestamp / 86400).Select(x => x.Last()).ToArray();
    }

    private async Task<IReadOnlyList<MarketQuote>> ReadTgjuAsync(CancellationToken token, CancellationToken caller)
    {
        try { using var json = await ReadJsonAsync("https://call1.tgju.org/ajax.json", token); return ParseQuotes(json.RootElement); }
        catch (Exception error) when (ProviderFailure(error, caller)) { return []; }
    }

    private async Task<IReadOnlyList<MarketQuote>> ReadNavAsync(CancellationToken token, CancellationToken caller)
    {
        try
        {
            using var json = await ReadJsonAsync("https://fund.fipiran.ir/api/v1/fund/fundlist", token);
            var quote = ParseOfficialNav(json.RootElement, Instruments.Single(x => x.Symbol == "MORVARID"));
            return quote is null ? [] : [quote];
        }
        catch (Exception error) when (ProviderFailure(error, caller)) { return []; }
    }

    private async Task<JsonDocument> ReadJsonAsync(string url, CancellationToken cancellationToken)
    {
        using var response = await http.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
    }

    public static List<MarketQuote> ParseQuotes(JsonElement root)
    {
        if (!root.TryGetProperty("current", out var current)) throw new InvalidDataException("Missing current prices.");
        var result = new List<MarketQuote>();
        foreach (var instrument in Instruments.Where(x => x.Provider == "tgju"))
        {
            if (!current.TryGetProperty(instrument.Key, out var row)
                || !Decimal(row, "p", out var price) || price <= 0
                || !row.TryGetProperty("ts", out var stamp)
                || !DateTime.TryParseExact(stamp.GetString(), "yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date)
                || !Decimal(row, "dp", out var change)) continue;
            var asOf = Time.TehranAt(DateOnly.FromDateTime(date), TimeOnly.FromDateTime(date));
            var falling = row.TryGetProperty("dt", out var direction) && direction.GetString() == "low";
            result.Add(new(instrument.Symbol, instrument.Name, price / instrument.Divisor, instrument.Unit,
                Math.Abs(change) * (falling ? -1 : 1), asOf, "TGJU", instrument.Category, instrument.PriceKind));
        }
        return result;
    }

    public static MarketQuote? ParseTsetmcQuote(JsonElement root, MarketInstrument instrument)
    {
        if (!root.TryGetProperty("closingPriceInfo", out var row) || !Decimal(row, "pClosing", out var price) || price <= 0
            || !row.TryGetProperty("dEven", out var rawDate) || !DateOnly.TryParseExact(rawDate.ToString(), "yyyyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var day)
            || !Decimal(row, "priceYesterday", out var previous) || previous <= 0
            || !Decimal(row, "zTotTran", out var trades) || trades <= 0) return null;
        var time = TimeOnly.MinValue;
        if (row.TryGetProperty("hEven", out var rawTime)) TimeOnly.TryParseExact(rawTime.ToString().PadLeft(6, '0'), "HHmmss", CultureInfo.InvariantCulture, DateTimeStyles.None, out time);
        return new(instrument.Symbol, instrument.Name, price / instrument.Divisor, instrument.Unit,
            (price / previous - 1) * 100, Time.TehranAt(day, time), "TSETMC", instrument.Category, "close");
    }

    public static MarketQuote? ParseOfficialNav(JsonElement root, MarketInstrument instrument)
    {
        // Only an explicitly denominated official report is accepted; an undated/unknown-unit NAV is unavailable.
        var rows = root.ValueKind == JsonValueKind.Array ? root : root.TryGetProperty("data", out var data) ? data : default;
        if (rows.ValueKind != JsonValueKind.Array) return null;
        foreach (var row in rows.EnumerateArray())
        {
            if (!row.TryGetProperty("regNo", out var registration) || registration.ToString() != instrument.Key
                || !row.TryGetProperty("currency", out var currency) || currency.GetString() != "IRR"
                || !Decimal(row, "cancelNav", out var nav) || nav <= 0
                || !row.TryGetProperty("date", out var stamp)
                || !DateOnly.TryParseExact(stamp.ToString().Replace('/', '-'), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var day)) continue;
            return new(instrument.Symbol, instrument.Name, nav / 10, instrument.Unit, null,
                Time.TehranAt(day, TimeOnly.MinValue), "FIPIRAN · redemption NAV", "funds", "nav");
        }
        return null;
    }

    public static List<PricePoint> ParseHistory(JsonElement root, decimal divisor, DateTimeOffset since)
    {
        var result = new List<PricePoint>();
        if (!root.TryGetProperty("data", out var rows) || rows.ValueKind != JsonValueKind.Array) return result;
        foreach (var row in rows.EnumerateArray())
        {
            if (row.ValueKind != JsonValueKind.Array || row.GetArrayLength() < 7
                || !DateOnly.TryParseExact(row[6].ToString(), "yyyy/MM/dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var day)
                || !decimal.TryParse(row[3].ToString(), NumberStyles.Number, CultureInfo.InvariantCulture, out var close) || close <= 0) continue;
            var at = Time.TehranAt(day, new TimeOnly(23, 59));
            if (at >= since) result.Add(new(at.ToUnixTimeSeconds(), close / divisor));
        }
        return result.OrderBy(x => x.Timestamp).ToList();
    }

    public static IReadOnlyList<PricePoint> ParseTsetmcHistory(JsonElement root, decimal divisor)
    {
        if (!root.TryGetProperty("closingPriceDaily", out var rows) || rows.ValueKind != JsonValueKind.Array) return [];
        return rows.EnumerateArray().Where(row => row.TryGetProperty("dEven", out _) && row.TryGetProperty("pClosing", out _))
            .Select(row => DateOnly.TryParseExact(row.GetProperty("dEven").ToString(), "yyyyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var day)
                && Decimal(row, "pClosing", out var close) && close > 0 && Decimal(row, "zTotTran", out var trades) && trades > 0
                ? new PricePoint(Time.TehranAt(day, new TimeOnly(23, 59)).ToUnixTimeSeconds(), close / divisor) : null)
            .OfType<PricePoint>().OrderBy(x => x.Timestamp).ToArray();
    }

    private static bool Decimal(JsonElement root, string name, out decimal value)
    {
        value = 0;
        return root.TryGetProperty(name, out var property) && decimal.TryParse(property.ToString(), NumberStyles.Number, CultureInfo.InvariantCulture, out value);
    }

    private static bool ProviderFailure(Exception error, CancellationToken caller) => !caller.IsCancellationRequested
        && error is HttpRequestException or JsonException or InvalidDataException or FormatException or InvalidOperationException or OperationCanceledException;
    private bool IsStale(MarketSnapshot snapshot) => snapshot.Error is not null || snapshot.Quotes.Count == 0
        || snapshot.Quotes.Any(x => clock.UtcNow() - x.AsOf > TimeSpan.FromHours(2));
}
