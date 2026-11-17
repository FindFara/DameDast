using MediatR;
using DameDast.Application.Interfaces.Sessions;
using DameDast.Application.Interfaces.Common;
using DameDast.Application.Features.Reminders.Models;
using DameDast.Application.Interfaces.Reminders;

namespace DameDast.Application.Features.Reminders.Commands;

public sealed record RemovePushCommand(string Endpoint) : IRequest, IAuthenticatedRequest;
public sealed class RemovePushCommandHandler(IPushSubscriptionService service, ICurrentUser currentUser) : IRequestHandler<RemovePushCommand>
{
    public Task Handle(RemovePushCommand request, CancellationToken cancellationToken) => service.RemoveAsync(currentUser.RequireId(), request.Endpoint, cancellationToken);
}
