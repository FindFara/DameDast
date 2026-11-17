using MediatR;
using DameDast.Application.Features.Market.Models;
using DameDast.Application.Interfaces.Market;

namespace DameDast.Application.Features.Market.Queries;

public sealed record GetMarketQuery : IRequest<MarketSnapshot>;
public sealed class GetMarketQueryHandler(IMarketService service) : IRequestHandler<GetMarketQuery, MarketSnapshot>
{
    public Task<MarketSnapshot> Handle(GetMarketQuery request, CancellationToken cancellationToken) => service.ReadAsync(cancellationToken);
}
