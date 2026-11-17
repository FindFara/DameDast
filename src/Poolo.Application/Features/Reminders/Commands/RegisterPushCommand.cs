using MediatR;
using Poolo.Application.Interfaces.Sessions;
using Poolo.Application.Interfaces.Common;
using Poolo.Application.Features.Reminders.Models;
using Poolo.Application.Interfaces.Reminders;

namespace Poolo.Application.Features.Reminders.Commands;

public sealed record RegisterPushCommand(PushRegistration Registration) : IRequest, IAuthenticatedRequest;
public sealed class RegisterPushCommandHandler(IPushSubscriptionService service, ICurrentUser currentUser) : IRequestHandler<RegisterPushCommand>
{
    public Task Handle(RegisterPushCommand request, CancellationToken cancellationToken) => service.RegisterAsync(currentUser.RequireId(), request.Registration, cancellationToken);
}
