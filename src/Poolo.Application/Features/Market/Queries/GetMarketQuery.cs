using MediatR;
using Poolo.Application.Features.Market.Models;
using Poolo.Application.Interfaces.Market;

namespace Poolo.Application.Features.Market.Queries;

public sealed record GetMarketQuery : IRequest<MarketSnapshot>;
public sealed class GetMarketQueryHandler(IMarketService service) : IRequestHandler<GetMarketQuery, MarketSnapshot>
{
    public Task<MarketSnapshot> Handle(GetMarketQuery request, CancellationToken cancellationToken) => service.ReadAsync(cancellationToken);
}
