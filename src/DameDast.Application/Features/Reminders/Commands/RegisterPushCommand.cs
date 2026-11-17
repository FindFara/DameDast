using MediatR;
using DameDast.Application.Interfaces.Sessions;
using DameDast.Application.Interfaces.Common;
using DameDast.Application.Features.Reminders.Models;
using DameDast.Application.Interfaces.Reminders;

namespace DameDast.Application.Features.Reminders.Commands;

public sealed record RegisterPushCommand(PushRegistration Registration) : IRequest, IAuthenticatedRequest;
public sealed class RegisterPushCommandHandler(IPushSubscriptionService service, ICurrentUser currentUser) : IRequestHandler<RegisterPushCommand>
{
    public Task Handle(RegisterPushCommand request, CancellationToken cancellationToken) => service.RegisterAsync(currentUser.RequireId(), request.Registration, cancellationToken);
}
