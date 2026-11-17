using MediatR;
using DameDast.Application.Features.Market.Models;
using DameDast.Application.Interfaces.Market;

namespace DameDast.Application.Features.Market.Queries;

public sealed record GetMarketHistoryQuery(string Symbol, int Days) : IRequest<IReadOnlyList<PricePoint>>;
public sealed class GetMarketHistoryQueryHandler(IMarketService service) : IRequestHandler<GetMarketHistoryQuery, IReadOnlyList<PricePoint>>
{
    public Task<IReadOnlyList<PricePoint>> Handle(GetMarketHistoryQuery request, CancellationToken cancellationToken) =>
        service.HistoryAsync(request.Symbol, request.Days, cancellationToken);
}
