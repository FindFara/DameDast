using MediatR;
using DameDast.Application.Interfaces.FinanceRecords;
using DameDast.Application.Interfaces.Sessions;
using DameDast.Application.Interfaces.Common;
using DameDast.Application.Features.FinanceRecords.Models;
using DameDast.Application.Interfaces.Portfolio;

namespace DameDast.Application.Features.Portfolio.Commands;

public sealed record SyncPortfolioCommand(SyncRequest Input) : IRequest<Snapshot>, IAuthenticatedRequest, ISyncRequest;
public sealed class SyncPortfolioCommandHandler(IPortfolioService service, ICurrentUser currentUser) : IRequestHandler<SyncPortfolioCommand, Snapshot>
{
    public Task<Snapshot> Handle(SyncPortfolioCommand request, CancellationToken cancellationToken) => service.SyncAsync(currentUser.RequireId(), request.Input, cancellationToken);
}
