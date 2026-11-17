using Poolo.Domain;

namespace Poolo.Application.Features.Benchmarks.Models;

public sealed record BenchmarkCurve(string Symbol, string Source, IReadOnlyList<BenchmarkPrice> Points, string? Error);
public sealed record BenchmarkSnapshot(IReadOnlyDictionary<string, BenchmarkCurve> Series, DateTimeOffset FetchedAt);
