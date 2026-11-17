using MediatR;
using Poolo.Application.Interfaces.Sessions;
using Poolo.Application.Interfaces.Common;
using Poolo.Application.Features.FinanceRecords.Models;
using Poolo.Application.Interfaces.FinanceRecords;

namespace Poolo.Application.Features.FinanceRecords.Queries;

public sealed record GetFinanceQuery : IRequest<Snapshot>, IAuthenticatedRequest;
public sealed class GetFinanceQueryHandler(IFinanceService service, ICurrentUser currentUser) : IRequestHandler<GetFinanceQuery, Snapshot>
{
    public Task<Snapshot> Handle(GetFinanceQuery request, CancellationToken cancellationToken) => service.ReadAsync(currentUser.RequireId(), cancellationToken);
}
