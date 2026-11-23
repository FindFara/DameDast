using System.Text.Json;
using DameDast.Domain;

namespace DameDast.Infrastructure.Persistence;

internal static class FinanceRecordMapping
{
    public static FinanceRecord ToDomain(this FinanceRecordRow row) =>
        new(row.Id, row.Kind, row.Version, row.Deleted, JsonSerializer.Deserialize<JsonElement>(row.Data));

    public static void UpdateFrom(this FinanceRecordRow row, FinanceRecord record, long sortOrder)
    {
        row.Kind = record.Kind;
        row.Version = record.Version;
        row.Deleted = record.Deleted;
        row.SortOrder = sortOrder;
        row.Data = record.Data.ValueKind == JsonValueKind.Undefined ? "null" : record.Data.GetRawText();
    }
}
