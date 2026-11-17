using MediatR;
using DameDast.Application.Interfaces.Sessions;
using DameDast.Application.Interfaces.Common;
using DameDast.Application.Features.FinanceRecords.Models;
using DameDast.Application.Interfaces.FinanceRecords;

namespace DameDast.Application.Features.FinanceRecords.Queries;

public sealed record GetFinanceQuery : IRequest<Snapshot>, IAuthenticatedRequest;
public sealed class GetFinanceQueryHandler(IFinanceService service, ICurrentUser currentUser) : IRequestHandler<GetFinanceQuery, Snapshot>
{
    public Task<Snapshot> Handle(GetFinanceQuery request, CancellationToken cancellationToken) => service.ReadAsync(currentUser.RequireId(), cancellationToken);
}
