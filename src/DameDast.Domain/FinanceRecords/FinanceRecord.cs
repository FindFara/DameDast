using System.Text.Json;

namespace DameDast.Domain;

public sealed record FinanceRecord(Guid Id, string Kind, long Version, bool Deleted, JsonElement Data);
