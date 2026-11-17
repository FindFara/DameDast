using MediatR;
using Poolo.Application.Interfaces.Sessions;
using Poolo.Application.Interfaces.Common;
using Poolo.Application.Features.FinanceRecords.Models;
using Poolo.Application.Interfaces.FinanceRecords;

namespace Poolo.Application.Features.FinanceRecords.Commands;

public sealed record SyncFinanceCommand(SyncRequest Input) : IRequest<Snapshot>, IAuthenticatedRequest, ISyncRequest;
public sealed class SyncFinanceCommandHandler(IFinanceService service, ICurrentUser currentUser) : IRequestHandler<SyncFinanceCommand, Snapshot>
{
    public Task<Snapshot> Handle(SyncFinanceCommand request, CancellationToken cancellationToken) => service.SyncAsync(currentUser.RequireId(), request.Input, cancellationToken);
}
