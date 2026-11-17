using Poolo.Application.Features.Benchmarks.Models;

namespace Poolo.Application.Interfaces.Benchmarks;

public interface IBenchmarkService
{
    Task<BenchmarkSnapshot> ReadAsync(CancellationToken cancellationToken);
}
