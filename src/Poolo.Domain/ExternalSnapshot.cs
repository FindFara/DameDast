using System.Globalization;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace Poolo.Domain;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ExternalSnapshot(string Format, string CaptureId, string Provider, string Account, string Scope, string Category, DateTimeOffset CapturedAt, string Coverage, IReadOnlyList<ExternalItem> Items);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ExternalItem(string Key, string Label, DateTimeOffset ObservedAt, string? AssetType = null, string? Symbol = null, string? Quantity = null, string? ValueToman = null, string? LockedToman = null, string? AmountToman = null, DateOnly? DueDate = null, string? Status = null);
public static class ExternalSnapshotRules
{
    public static readonly string[] Providers = ["easytrader", "digipay", "snapppay", "agah", "nobitex"];
    public static void Validate(ExternalSnapshot snapshot)
    {
        if (snapshot.Format != "damdast-portfolio-v1" || !Providers.Contains(snapshot.Provider) || snapshot.Category is not ("assets" or "installments") || snapshot.Coverage is not ("partial" or "complete") || snapshot.Items is null || snapshot.Items.Count > 200 || snapshot.CapturedAt.Year is < 2000 or > 2099 || snapshot.CapturedAt.Offset != TimeSpan.Zero)
            throw new FinanceException("Invalid portfolio snapshot.");
        Text(snapshot.CaptureId, 64);
        Text(snapshot.Account, 50);
        Text(snapshot.Scope, 50);
        var keys = new HashSet<string>(StringComparer.Ordinal);
        foreach (var item in snapshot.Items)
        {
            if (item is null)
                throw new FinanceException("Invalid portfolio row.");
            Text(item.Key, 120);
            Text(item.Label, 80);
            if (!keys.Add(item.Key) || item.ObservedAt.Year < 2000 || item.ObservedAt.Offset != TimeSpan.Zero || item.ObservedAt > snapshot.CapturedAt)
                throw new FinanceException("Duplicate portfolio row or invalid observation time.");
            if (snapshot.Category == "assets")
                ValidateAsset(item);
            else
                ValidateInstallment(item);
        }
    }

    public static bool SameScope(ExternalSnapshot a, ExternalSnapshot b) => a.Provider == b.Provider && a.Account == b.Account && a.Scope == b.Scope && a.Category == b.Category;
    private static void ValidateAsset(ExternalItem item)
    {
        if (item.AssetType is not ("cash" or "equity" or "crypto" or "other") || item.AmountToman is not null || item.Status is not null || item.DueDate is not null)
            throw new FinanceException("Invalid external asset.");
        if (!string.IsNullOrEmpty(item.Symbol))
            Text(item.Symbol, 30);
        DecimalString(item.Quantity, 18, true);
        DecimalString(item.ValueToman, 2, true);
        DecimalString(item.LockedToman, 2, true);
        if (item.Quantity is null && item.ValueToman is null)
            throw new FinanceException("An asset needs quantity or value.");
        if (item.ValueToman is not null && item.LockedToman is not null && Money(item.LockedToman) > Money(item.ValueToman))
            throw new FinanceException("Locked value exceeds asset value.");
    }

    private static void ValidateInstallment(ExternalItem item)
    {
        if (item.Status is not ("paid" or "unpaid" or "unknown") || item.DueDate?.Year is < 2000 or > 2099 || item.AssetType is not null || item.Symbol is not null || item.Quantity is not null || item.ValueToman is not null || item.LockedToman is not null)
            throw new FinanceException("Invalid imported installment.");
        DecimalString(item.AmountToman, 2, false);
    }

    private static void Text(string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value) || value != value.Trim() || value.Length > max || value.Any(char.IsControl))
            throw new FinanceException("Invalid portfolio text.");
    }

    private static void DecimalString(string? value, int scale, bool optional)
    {
        if (value is null && optional)
            return;
        if (value is null || !Regex.IsMatch(value, $@"\A(0|[1-9][0-9]{{0,14}})(\.[0-9]{{1,{scale}}})?\z", RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(50)))
            throw new FinanceException("Invalid portfolio amount.");
    }

    private static decimal Money(string value) => decimal.Parse(value, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture);
}
