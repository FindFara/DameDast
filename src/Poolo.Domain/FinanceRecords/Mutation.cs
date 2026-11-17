using System.Text.Json;

namespace Poolo.Domain;

public sealed record Mutation(Guid OperationId, Guid Id, string Kind, long ExpectedVersion, bool Delete, JsonElement Data);
