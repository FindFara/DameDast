using System.Text.Json;

namespace Poolo.Domain;

public sealed record FinanceRecord(Guid Id, string Kind, long Version, bool Deleted, JsonElement Data);
