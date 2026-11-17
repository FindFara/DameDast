using MediatR;
using DameDast.Application.Features.Benchmarks.Models;
using DameDast.Application.Interfaces.Benchmarks;

namespace DameDast.Application.Features.Benchmarks.Queries;

public sealed record GetBenchmarksQuery : IRequest<BenchmarkSnapshot>;
public sealed class GetBenchmarksQueryHandler(IBenchmarkService service) : IRequestHandler<GetBenchmarksQuery, BenchmarkSnapshot>
{
    public Task<BenchmarkSnapshot> Handle(GetBenchmarksQuery request, CancellationToken cancellationToken) => service.ReadAsync(cancellationToken);
}
