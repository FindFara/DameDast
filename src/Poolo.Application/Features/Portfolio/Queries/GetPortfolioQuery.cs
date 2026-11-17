using MediatR;
using Poolo.Application.Interfaces.Sessions;
using Poolo.Application.Interfaces.Common;
using Poolo.Application.Features.FinanceRecords.Models;
using Poolo.Application.Interfaces.Portfolio;

namespace Poolo.Application.Features.Portfolio.Queries;

public sealed record GetPortfolioQuery : IRequest<Snapshot>, IAuthenticatedRequest;
public sealed class GetPortfolioQueryHandler(IPortfolioService service, ICurrentUser currentUser) : IRequestHandler<GetPortfolioQuery, Snapshot>
{
    public Task<Snapshot> Handle(GetPortfolioQuery request, CancellationToken cancellationToken) => service.ReadAsync(currentUser.RequireId(), cancellationToken);
}
