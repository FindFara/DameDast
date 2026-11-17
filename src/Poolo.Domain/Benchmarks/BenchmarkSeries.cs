namespace Poolo.Domain;

public sealed record BenchmarkSeries(string Symbol, int Year, string Source, IReadOnlyList<BenchmarkPrice> Points);
