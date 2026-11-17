using MediatR;
using DameDast.Application.Interfaces.Sessions;
using DameDast.Application.Interfaces.Common;
using DameDast.Application.Features.FinanceRecords.Models;
using DameDast.Application.Interfaces.FinanceRecords;

namespace DameDast.Application.Features.FinanceRecords.Commands;

public sealed record SyncFinanceCommand(SyncRequest Input) : IRequest<Snapshot>, IAuthenticatedRequest, ISyncRequest;
public sealed class SyncFinanceCommandHandler(IFinanceService service, ICurrentUser currentUser) : IRequestHandler<SyncFinanceCommand, Snapshot>
{
    public Task<Snapshot> Handle(SyncFinanceCommand request, CancellationToken cancellationToken) => service.SyncAsync(currentUser.RequireId(), request.Input, cancellationToken);
}
