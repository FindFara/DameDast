using MediatR;
using Poolo.Application.Interfaces.FinanceRecords;
using Poolo.Application.Interfaces.Sessions;
using Poolo.Application.Interfaces.Common;
using Poolo.Application.Features.FinanceRecords.Models;
using Poolo.Application.Interfaces.Portfolio;

namespace Poolo.Application.Features.Portfolio.Commands;

public sealed record SyncPortfolioCommand(SyncRequest Input) : IRequest<Snapshot>, IAuthenticatedRequest, ISyncRequest;
public sealed class SyncPortfolioCommandHandler(IPortfolioService service, ICurrentUser currentUser) : IRequestHandler<SyncPortfolioCommand, Snapshot>
{
    public Task<Snapshot> Handle(SyncPortfolioCommand request, CancellationToken cancellationToken) => service.SyncAsync(currentUser.RequireId(), request.Input, cancellationToken);
}
