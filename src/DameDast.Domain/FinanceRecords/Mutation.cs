using System.Text.Json;

namespace DameDast.Domain;

public sealed record Mutation(Guid OperationId, Guid Id, string Kind, long ExpectedVersion, bool Delete, JsonElement Data);
