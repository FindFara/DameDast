using System.Text.Json;
using System.Text.Json.Serialization;

namespace DameDast.Domain;

public sealed record WorkbenchWidgetOptions(string? ImageData = null, string? Url = null, string? Description = null,
    string? Calendar = null, string? ClockStyle = null, string? TimeZone = null, string? PetStyle = null, string? Page = null)
{
    [JsonExtensionData] public Dictionary<string, JsonElement>? AdditionalProperties { get; init; }
}

public static class WorkbenchOptionRules
{
    public const int MaximumImageDataLength = 120000;
    private static readonly string[] ShortcutPages = ["overview","notes","tasks","calendar","canvas","projects","habits","bookmarks","accounts","transactions","budgets","goals","reminders","assets","market","installments","monthlyPlan","monthlyExpenses","receivables","connected","suggestions","locked","reports","settings"];

    public static void Validate(string type, WorkbenchWidgetOptions? options)
    {
        if (options is null) return;
        if (type is not ("image" or "plainCalendar" or "link" or "calculator" or "keyGenerator" or "clock" or "pet" or "search" or "googleServices" or "shortcut") ||
            options.AdditionalProperties?.Any(entry => entry.Value.ValueKind != JsonValueKind.Null) == true ||
            (options.ImageData is not null && type != "image") ||
            (options.Url is not null && type != "link") ||
            (options.Description is not null && type is not ("image" or "link")) ||
            (options.Calendar is not null && (type != "plainCalendar" || options.Calendar is not ("persian" or "gregory"))) ||
            (options.ClockStyle is not null && (type != "clock" || options.ClockStyle is not ("digital" or "analog"))) ||
            (options.TimeZone is not null && (type != "clock" || options.TimeZone is not ("local" or "Asia/Tehran" or "UTC"))) ||
            (options.PetStyle is not null && (type != "pet" || options.PetStyle is not ("dog" or "cat" or "robot"))) ||
            (options.Page is not null && (type != "shortcut" || !ShortcutPages.Contains(options.Page))) ||
            (options.Description is not null && (options.Description.Length > 200 || options.Description != options.Description.Trim())))
            throw new FinanceException("Invalid component settings.");

        if (options.Url is { } url && (url.Length > 2000 || url.Any(c => char.IsWhiteSpace(c) || char.IsControl(c)) ||
            !Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https") ||
            string.IsNullOrEmpty(uri.Host) || !string.IsNullOrEmpty(uri.UserInfo)))
            throw new FinanceException("Enter a valid http or https link.");

        if (options.ImageData is { } image && !ValidImage(image))
            throw new FinanceException("Choose a PNG, JPEG or WebP image up to 5 MB.");
    }

    private static bool ValidImage(string data)
    {
        if (data.Length > MaximumImageDataLength) return false;
        var comma = data.IndexOf(',');
        if (comma < 0) return false;
        var prefix = data[..comma];
        if (prefix is not ("data:image/png;base64" or "data:image/jpeg;base64" or "data:image/webp;base64")) return false;
        var encoded = data[(comma + 1)..];
        if (encoded.Length == 0 || encoded.Length % 4 != 0 || encoded.Any(c => !char.IsAsciiLetterOrDigit(c) && c is not ('+' or '/' or '='))) return false;
        try
        {
            var bytes = Convert.FromBase64String(encoded);
            return prefix switch
            {
                "data:image/png;base64" => bytes.AsSpan().StartsWith(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }),
                "data:image/jpeg;base64" => bytes.AsSpan().StartsWith(new byte[] { 255, 216, 255 }),
                _ => bytes.Length >= 12 && bytes.AsSpan(0, 4).SequenceEqual("RIFF"u8) && bytes.AsSpan(8, 4).SequenceEqual("WEBP"u8)
            };
        }
        catch (FormatException) { return false; }
    }
}
