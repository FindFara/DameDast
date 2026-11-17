using DameDast.Domain;

namespace DameDast.Application.Features.FinanceRecords.Models;

public sealed record Snapshot(long Revision, IReadOnlyList<FinanceRecord> Records);
public sealed record SyncRequest(IReadOnlyList<Mutation> Changes);
