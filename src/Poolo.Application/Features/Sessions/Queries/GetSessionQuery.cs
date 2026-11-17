using MediatR;
using Poolo.Application.Interfaces.Sessions;
using Poolo.Application.Interfaces.Reminders;

namespace Poolo.Application.Features.Sessions.Queries;

public sealed record GetSessionQuery : IRequest<SessionInfo>;
public sealed record SessionInfo(bool Authenticated, string? UserId, string? Name, bool PushConfigured);
public sealed class GetSessionQueryHandler(ICurrentUser currentUser, IPushSubscriptionService push) : IRequestHandler<GetSessionQuery, SessionInfo>
{
    public Task<SessionInfo> Handle(GetSessionQuery request, CancellationToken cancellationToken) => Task.FromResult(new SessionInfo(currentUser.IsAuthenticated, currentUser.IsAuthenticated ? currentUser.Id : null, currentUser.IsAuthenticated ? currentUser.Name : null, push.Configuration.Configured));
}
