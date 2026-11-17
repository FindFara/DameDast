using MediatR;
using Poolo.Application.Interfaces.Sessions;
using Poolo.Application.Interfaces.Common;
using Poolo.Application.Features.Reminders.Models;
using Poolo.Application.Interfaces.Reminders;

namespace Poolo.Application.Features.Reminders.Commands;

public sealed record RemovePushCommand(string Endpoint) : IRequest, IAuthenticatedRequest;
public sealed class RemovePushCommandHandler(IPushSubscriptionService service, ICurrentUser currentUser) : IRequestHandler<RemovePushCommand>
{
    public Task Handle(RemovePushCommand request, CancellationToken cancellationToken) => service.RemoveAsync(currentUser.RequireId(), request.Endpoint, cancellationToken);
}
