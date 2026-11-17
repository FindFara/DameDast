namespace Poolo.Domain;

public sealed record AllocationPlan(string Month, decimal Total, IReadOnlyList<AllocationRow> Rows);
