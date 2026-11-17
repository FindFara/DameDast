namespace DameDast.Domain;

public sealed record BenchmarkPrice(DateOnly Date, decimal Price, string? Source = null);
