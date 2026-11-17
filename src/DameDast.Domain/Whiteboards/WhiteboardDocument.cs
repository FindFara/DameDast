using System.Text.Json;
using System.Text.RegularExpressions;

namespace DameDast.Domain;

public sealed record WhiteboardSettings(string ViewBackgroundColor = "#ffffff", int? GridSize = null, int GridStep = 5);
public sealed record WhiteboardScene(IReadOnlyList<JsonElement> Elements, IReadOnlyDictionary<string, JsonElement> Files, WhiteboardSettings Settings);
public sealed record WhiteboardState(long Revision, string Title, WhiteboardScene Scene, IReadOnlyDictionary<string, long> ElementVersions, long SettingsVersion)
{
    public static WhiteboardState Empty => new(0, "Untitled canvas", new([], new Dictionary<string, JsonElement>(), new()), new Dictionary<string, long>(), 0);
}
public sealed record WhiteboardElementChange(string Id, long ExpectedVersion, JsonElement Element);
public sealed record WhiteboardPatch(Guid OperationId, IReadOnlyList<WhiteboardElementChange> Changes,
    IReadOnlyDictionary<string, JsonElement>? Files = null, WhiteboardSettings? Settings = null, long? ExpectedSettingsVersion = null, string? Title = null);
public sealed record WhiteboardAccess(WhiteboardState State, string Role, bool Exists);
public sealed record WhiteboardGrant(Guid Id, string Token, string Role, DateTimeOffset ExpiresAt);
public sealed class WhiteboardConflictException(IReadOnlyList<string> ids, WhiteboardState state) : Exception("Some elements changed on another device.")
{
    public IReadOnlyList<string> ElementIds { get; } = ids;
    public WhiteboardState State { get; } = state;
}

public static class WhiteboardRules
{
    public const int MaximumBytes = 8_000_000;
    private static readonly HashSet<string> Types = ["rectangle", "diamond", "ellipse", "line", "arrow", "freedraw", "text", "image", "frame"];
    private static readonly Regex Identifier = new("^[a-zA-Z0-9_-]{1,100}$", RegexOptions.CultureInvariant);
    private static readonly Regex Color = new("^(#[0-9a-fA-F]{3,8}|transparent)$", RegexOptions.CultureInvariant);

    public static WhiteboardState Apply(WhiteboardState current, WhiteboardPatch patch)
    {
        if (patch.OperationId == Guid.Empty || patch.Changes is null || patch.Changes.Count > 3000 ||
            patch.Changes.Any(c => c is null || !Identifier.IsMatch(c.Id ?? "") || c.ExpectedVersion < 0) ||
            patch.Changes.Select(c => c.Id).Distinct().Count() != patch.Changes.Count)
            throw new FinanceException("Invalid whiteboard update.");
        var conflicts = patch.Changes.Where(c => current.ElementVersions.GetValueOrDefault(c.Id) != c.ExpectedVersion).Select(c => c.Id).ToList();
        if ((patch.Settings is not null || patch.Title is not null) && patch.ExpectedSettingsVersion != current.SettingsVersion)
            conflicts.Add("$settings");
        if (conflicts.Count > 0) throw new WhiteboardConflictException(conflicts, current);

        var elements = current.Scene.Elements.ToDictionary(e => e.GetProperty("id").GetString()!);
        var versions = current.ElementVersions.ToDictionary();
        foreach (var change in patch.Changes)
        {
            ValidateElement(change.Element);
            if (change.Element.GetProperty("id").GetString() != change.Id) throw new FinanceException("Element identifier does not match.");
            elements[change.Id] = change.Element.Clone();
            versions[change.Id] = current.Revision + 1;
        }
        var files = current.Scene.Files.ToDictionary();
        foreach (var (id, file) in patch.Files ?? new Dictionary<string, JsonElement>())
        {
            ValidateFile(id, file);
            if (files.TryGetValue(id, out var previous) && previous.GetProperty("dataURL").GetString() != file.GetProperty("dataURL").GetString())
                throw new FinanceException("An image identifier cannot be reused with different content.");
            files[id] = file.Clone();
        }
        var scene = new WhiteboardScene(elements.Values.OrderBy(e => e.TryGetProperty("index", out var index) ? index.GetString() : "z", StringComparer.Ordinal).ToArray(), files,
            patch.Settings ?? current.Scene.Settings);
        var next = new WhiteboardState(current.Revision + 1, patch.Title ?? current.Title, scene, versions,
            patch.Settings is not null || patch.Title is not null ? current.Revision + 1 : current.SettingsVersion);
        Validate(next);
        return next;
    }

    public static void Validate(WhiteboardState state)
    {
        if (string.IsNullOrWhiteSpace(state.Title) || state.Title.Length > 80 || state.Scene.Elements.Count > 3000 || state.Scene.Files.Count > 50 ||
            !Color.IsMatch(state.Scene.Settings.ViewBackgroundColor ?? "") || state.Scene.Settings.GridSize is < 1 or > 1000 || state.Scene.Settings.GridStep is < 1 or > 100 ||
            System.Text.Encoding.UTF8.GetByteCount(JsonSerializer.Serialize(state, FinanceRules.Json)) > MaximumBytes)
            throw new FinanceException("Whiteboard exceeds the supported size or contains invalid settings.");
        foreach (var element in state.Scene.Elements) ValidateElement(element);
        foreach (var (id, file) in state.Scene.Files) ValidateFile(id, file);
        if (state.Scene.Elements.Where(e => e.GetProperty("type").GetString() == "image" && !(e.TryGetProperty("isDeleted", out var deleted) && deleted.GetBoolean()))
            .Any(e => !e.TryGetProperty("fileId", out var file) || file.ValueKind != JsonValueKind.String || !state.Scene.Files.ContainsKey(file.GetString()!)))
            throw new FinanceException("An image is missing from the document.");
    }

    private static void ValidateElement(JsonElement e)
    {
        if (e.ValueKind != JsonValueKind.Object || !e.TryGetProperty("id", out var id) || id.ValueKind != JsonValueKind.String || !Identifier.IsMatch(id.GetString()!) ||
            !e.TryGetProperty("type", out var type) || type.ValueKind != JsonValueKind.String || !Types.Contains(type.GetString()!))
            throw new FinanceException("Invalid whiteboard element.");
        foreach (var key in new[] { "x", "y", "width", "height", "angle" })
            if (!e.TryGetProperty(key, out var n) || n.ValueKind != JsonValueKind.Number || !n.TryGetDouble(out var value) || !double.IsFinite(value) || Math.Abs(value) > 10_000_000)
                throw new FinanceException("Invalid whiteboard geometry.");
        foreach (var key in new[] { "strokeColor", "backgroundColor" })
            if (e.TryGetProperty(key, out var c) && (c.ValueKind != JsonValueKind.String || !Color.IsMatch(c.GetString()!)))
                throw new FinanceException("Invalid whiteboard color.");
        if (e.TryGetProperty("index", out var index) && index.ValueKind is not (JsonValueKind.Null or JsonValueKind.String))
            throw new FinanceException("Invalid element order.");
        if (e.TryGetProperty("isDeleted", out var deleted) && deleted.ValueKind is not (JsonValueKind.True or JsonValueKind.False))
            throw new FinanceException("Invalid element state.");
        if (e.TryGetProperty("text", out var text) && (text.ValueKind != JsonValueKind.String || text.GetString()!.Length > 20000))
            throw new FinanceException("Whiteboard text is too long.");
        if (e.TryGetProperty("link", out var link) && link.ValueKind == JsonValueKind.String && !SafeLink(link.GetString()!))
            throw new FinanceException("Invalid element link.");
        if (e.TryGetProperty("points", out var points) && (points.ValueKind != JsonValueKind.Array || points.GetArrayLength() > 20000 || points.EnumerateArray().Any(p =>
            p.ValueKind != JsonValueKind.Array || p.GetArrayLength() != 2 || p.EnumerateArray().Any(n => n.ValueKind != JsonValueKind.Number || !n.TryGetDouble(out var v) || !double.IsFinite(v) || Math.Abs(v) > 10_000_000))))
            throw new FinanceException("Invalid whiteboard points.");
    }

    private static bool SafeLink(string link) => link.StartsWith('/') && !link.StartsWith("//") && !link.Contains('\\') ||
        Uri.TryCreate(link, UriKind.Absolute, out var uri) && uri.Scheme is "https" or "http";

    private static void ValidateFile(string id, JsonElement file)
    {
        if (!Identifier.IsMatch(id) || file.ValueKind != JsonValueKind.Object || !file.TryGetProperty("id", out var fileId) || fileId.ValueKind != JsonValueKind.String || fileId.GetString() != id ||
            !file.TryGetProperty("mimeType", out var mime) || mime.ValueKind != JsonValueKind.String || mime.GetString() is not ("image/png" or "image/jpeg" or "image/webp" or "image/gif") ||
            !file.TryGetProperty("dataURL", out var raw) || raw.ValueKind != JsonValueKind.String || raw.GetString()!.Length > 2_800_000)
            throw new FinanceException("Use PNG, JPEG, WebP or GIF images under 2 MB.");
        var prefix = $"data:{mime.GetString()};base64,";
        if (!raw.GetString()!.StartsWith(prefix, StringComparison.Ordinal)) throw new FinanceException("Invalid image data.");
        try
        {
            var bytes = Convert.FromBase64String(raw.GetString()![prefix.Length..]);
            var valid = mime.GetString() switch
            {
                "image/png" => bytes.AsSpan().StartsWith(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }),
                "image/jpeg" => bytes.AsSpan().StartsWith(new byte[] { 255, 216, 255 }),
                "image/gif" => bytes.AsSpan().StartsWith("GIF8"u8),
                "image/webp" => bytes.Length >= 12 && bytes.AsSpan(0, 4).SequenceEqual("RIFF"u8) && bytes.AsSpan(8, 4).SequenceEqual("WEBP"u8),
                _ => false
            };
            if (!valid || bytes.Length > 2_000_000) throw new FinanceException("Invalid image content.");
        }
        catch (FormatException) { throw new FinanceException("Invalid image encoding."); }
    }
}
