using MediatR;
using DameDast.Application.Interfaces.Common;
using DameDast.Application.Features.Reminders.Models;
using DameDast.Application.Interfaces.Reminders;

namespace DameDast.Application.Features.Reminders.Queries;

public sealed record GetPushKeyQuery : IRequest<PushPublicKey>, IAuthenticatedRequest;
public sealed record PushPublicKey(string? PublicKey);
public sealed class GetPushKeyQueryHandler(IPushSubscriptionService service) : IRequestHandler<GetPushKeyQuery, PushPublicKey>
{
    public Task<PushPublicKey> Handle(GetPushKeyQuery request, CancellationToken cancellationToken) => Task.FromResult<PushPublicKey>(new(service.Configuration.PublicKey));
}
