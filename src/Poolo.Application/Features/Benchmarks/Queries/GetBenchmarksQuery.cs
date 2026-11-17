using MediatR;
using Poolo.Application.Features.Benchmarks.Models;
using Poolo.Application.Interfaces.Benchmarks;

namespace Poolo.Application.Features.Benchmarks.Queries;

public sealed record GetBenchmarksQuery : IRequest<BenchmarkSnapshot>;
public sealed class GetBenchmarksQueryHandler(IBenchmarkService service) : IRequestHandler<GetBenchmarksQuery, BenchmarkSnapshot>
{
    public Task<BenchmarkSnapshot> Handle(GetBenchmarksQuery request, CancellationToken cancellationToken) => service.ReadAsync(cancellationToken);
}
