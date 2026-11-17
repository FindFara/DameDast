using MediatR;
using Poolo.Application.Interfaces.Common;
using Poolo.Application.Features.Reminders.Models;
using Poolo.Application.Interfaces.Reminders;

namespace Poolo.Application.Features.Reminders.Queries;

public sealed record GetPushKeyQuery : IRequest<PushPublicKey>, IAuthenticatedRequest;
public sealed record PushPublicKey(string? PublicKey);
public sealed class GetPushKeyQueryHandler(IPushSubscriptionService service) : IRequestHandler<GetPushKeyQuery, PushPublicKey>
{
    public Task<PushPublicKey> Handle(GetPushKeyQuery request, CancellationToken cancellationToken) => Task.FromResult<PushPublicKey>(new(service.Configuration.PublicKey));
}
