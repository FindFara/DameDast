using MediatR;
using Poolo.Application.Interfaces.Common;
using Poolo.Application.Features.Reminders.Models;
using Poolo.Application.Interfaces.Reminders;

namespace Poolo.Application.Features.Reminders.Queries;

public sealed record GetPushConfigurationQuery : IRequest<PushConfiguration>;
public sealed class GetPushConfigurationQueryHandler(IPushSubscriptionService service) : IRequestHandler<GetPushConfigurationQuery, PushConfiguration>
{
    public Task<PushConfiguration> Handle(GetPushConfigurationQuery request, CancellationToken cancellationToken) =>
        Task.FromResult<PushConfiguration>(service.Configuration);
}
