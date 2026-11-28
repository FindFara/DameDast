using System.Text.Json.Nodes;

namespace DameDast.Domain;

// Asset classifications share the record ID/version. Keep each type's details for a later switch back.
public static class AssetTypeRules
{
    public static bool IsAsset(string kind) => kind is "assetPosition" or "receivable" or "locked";
    public static Mutation PreserveDetails(FinanceRecord? current, Mutation change)
    {
        if (change.Delete || !IsAsset(change.Kind) || change.Data.ValueKind != System.Text.Json.JsonValueKind.Object) return change;
        var data = JsonNode.Parse(change.Data.GetRawText())!.AsObject();
        var archive = current?.Data.TryGetProperty("assetTypeData", out var history) == true
            ? JsonNode.Parse(history.GetRawText()) as JsonObject : data["assetTypeData"] as JsonObject;
        archive = archive?.DeepClone() as JsonObject ?? [];
        foreach (var key in archive.Select(x => x.Key).Where(key => !IsAsset(key)).ToArray()) archive.Remove(key);
        if (current is not null && current.Kind != change.Kind)
        {
            var previous = JsonNode.Parse(current.Data.GetRawText())!.AsObject();
            previous.Remove("assetTypeData");
            archive[current.Kind] = previous;
        }
        if (archive.Count > 0) data["assetTypeData"] = archive;
        return change with { Data = System.Text.Json.JsonSerializer.SerializeToElement(data, FinanceRules.Json) };
    }
}
