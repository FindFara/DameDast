using MediatR;
using DameDast.Application.Interfaces.Sessions;
using DameDast.Application.Interfaces.Common;
using DameDast.Application.Features.FinanceRecords.Models;
using DameDast.Application.Interfaces.Portfolio;

namespace DameDast.Application.Features.Portfolio.Queries;

public sealed record GetPortfolioQuery : IRequest<Snapshot>, IAuthenticatedRequest;
public sealed class GetPortfolioQueryHandler(IPortfolioService service, ICurrentUser currentUser) : IRequestHandler<GetPortfolioQuery, Snapshot>
{
    public Task<Snapshot> Handle(GetPortfolioQuery request, CancellationToken cancellationToken) => service.ReadAsync(currentUser.RequireId(), cancellationToken);
}
