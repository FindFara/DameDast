using DameDast.Application.Features.Benchmarks.Models;

namespace DameDast.Application.Interfaces.Benchmarks;

public interface IBenchmarkService
{
    Task<BenchmarkSnapshot> ReadAsync(CancellationToken cancellationToken);
}
