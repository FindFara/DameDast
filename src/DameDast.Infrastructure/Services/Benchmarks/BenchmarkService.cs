using System.Globalization;
using System.Text.Json;
using DameDast.Application.Features.Benchmarks.Models;
using DameDast.Application.Interfaces.Benchmarks;
using DameDast.Common;
using DameDast.Domain;

namespace DameDast.Infrastructure.Services.Benchmarks;

public sealed class BenchmarkService(HttpClient http, TimeProvider clock) : IBenchmarkService
{
    private readonly SemaphoreSlim gate = new(1, 1);
    private BenchmarkSnapshot? cached;
    public async Task<BenchmarkSnapshot> ReadAsync(CancellationToken cancellationToken)
    {
        await gate.WaitAsync(cancellationToken);
        try
        {
            if (cached is not null && clock.UtcNow() - cached.FetchedAt < TimeSpan.FromMinutes(cached.Series.Values.Any(x => x.Error is not null) ? 5 : 360))
                return cached;
            var tasks = new[]
            {
                FetchTgjuAsync("GOLD", "geram18", 10, cancellationToken),
                FetchTgjuAsync("USD", "price_dollar_rl", 10, cancellationToken),
                FetchTgjuAsync("BTC_USD", "crypto-bitcoin", 1, cancellationToken),
                FetchFundAsync(cancellationToken)
            };
            var curves = await Task.WhenAll(tasks);
            cached = new(curves.ToDictionary(x => x.Symbol), clock.UtcNow());
            return cached;
        }
        finally
        {
            gate.Release();
        }
    }

    private async Task<BenchmarkCurve> FetchTgjuAsync(string symbol, string key, decimal divisor, CancellationToken cancellationToken)
    {
        try
        {
            using var json = await GetJsonAsync($"https://api.tgju.org/v1/market/indicator/summary-table-data/{key}", cancellationToken);
            var points = ParseTgju(json.RootElement, divisor, clock.TehranToday());
            return new(symbol, "TGJU · daily close", points, points.Count == 0 ? "History unavailable" : null);
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or InvalidDataException or FormatException or InvalidOperationException or OperationCanceledException && !cancellationToken.IsCancellationRequested)
        {
            return new(symbol, "TGJU · daily close", [], "History unavailable");
        }
    }

    private async Task<BenchmarkCurve> FetchFundAsync(CancellationToken cancellationToken)
    {
        const string source = "TSETMC · Yaghoot closing unit price";
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(18));
        var token = timeout.Token;
        try
        {
            using var search = await GetJsonAsync("https://cdn.tsetmc.com/api/Instrument/GetInstrumentSearch/" + Uri.EscapeDataString("یاقوت"), token);
            var code = SelectYaghoot(search.RootElement);
            if (code is null)
                throw new InvalidDataException("Fund instrument unavailable.");
            using var adjustments = await GetJsonAsync($"https://cdn.tsetmc.com/api/ClosingPrice/GetPriceAdjustList/{code}", token);
            if (!adjustments.RootElement.TryGetProperty("priceAdjust", out var events) || events.ValueKind != JsonValueKind.Array || events.GetArrayLength() != 0)
                throw new InvalidDataException("Adjusted fund history required.");
            using var history = await GetJsonAsync($"https://cdn.tsetmc.com/api/ClosingPrice/GetClosingPriceDailyList/{code}/0", token);
            var points = ParseFund(history.RootElement, clock.TehranToday());
            return new("FUND", source, points, points.Count == 0 ? "History unavailable" : null);
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or InvalidDataException or FormatException or InvalidOperationException or OperationCanceledException && !cancellationToken.IsCancellationRequested)
        {
            return new("FUND", source, [], "Provider unavailable or adjusted history required. Import comparable adjusted unit prices.");
        }
    }

    private async Task<JsonDocument> GetJsonAsync(string url, CancellationToken cancellationToken)
    {
        using var response = await http.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
    }

    public static IReadOnlyList<BenchmarkPrice> ParseTgju(JsonElement root, decimal divisor, DateOnly through)
    {
        var points = new List<BenchmarkPrice>();
        if (!root.TryGetProperty("data", out var rows) || rows.ValueKind != JsonValueKind.Array)
            return points;
        foreach (var row in rows.EnumerateArray())
            if (row.ValueKind == JsonValueKind.Array && row.GetArrayLength() > 6 && DateOnly.TryParseExact(row[6].ToString(), "yyyy/MM/dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date) && date.Year >= 2000 && date <= through && decimal.TryParse(row[3].ToString(), NumberStyles.Number, CultureInfo.InvariantCulture, out var value) && value > 0)
                points.Add(new(date, value / divisor));
        return points.DistinctBy(x => x.Date).OrderBy(x => x.Date).ToArray();
    }

    public static string? SelectYaghoot(JsonElement root)
    {
        if (!root.TryGetProperty("instrumentSearch", out var rows) || rows.ValueKind != JsonValueKind.Array)
            return null;
        static string Normalize(string? value) => (value ?? "").Replace('ي', 'ی').Replace('ك', 'ک').Trim();
        foreach (var row in rows.EnumerateArray())
        {
            if (!row.TryGetProperty("lVal18AFC", out var symbol) || Normalize(symbol.GetString()) != "یاقوت" || !row.TryGetProperty("lVal30", out var name) || !Normalize(name.GetString()).Contains("آگاه", StringComparison.Ordinal) || !row.TryGetProperty("insCode", out var id))
                continue;
            var code = id.ValueKind == JsonValueKind.String ? id.GetString() : id.GetRawText();
            if (code is { Length: >= 10 and <= 25 } && code.All(char.IsAsciiDigit))
                return code;
        }

        return null;
    }

    public static IReadOnlyList<BenchmarkPrice> ParseFund(JsonElement root, DateOnly through)
    {
        var points = new List<BenchmarkPrice>();
        if (!root.TryGetProperty("closingPriceDaily", out var rows) || rows.ValueKind != JsonValueKind.Array)
            return points;
        foreach (var row in rows.EnumerateArray())
            if (row.TryGetProperty("dEven", out var dateValue) && DateOnly.TryParseExact(dateValue.ToString(), "yyyyMMdd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date) && date.Year >= 2000 && date <= through && row.TryGetProperty("pClosing", out var price) && price.TryGetDecimal(out var value) && value > 0 && row.TryGetProperty("zTotTran", out var trades) && trades.TryGetInt64(out var count) && count > 0)
                points.Add(new(date, value / 10));
        return points.DistinctBy(x => x.Date).OrderBy(x => x.Date).ToArray();
    }
}
