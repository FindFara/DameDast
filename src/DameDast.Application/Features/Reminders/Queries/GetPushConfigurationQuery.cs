using MediatR;
using DameDast.Application.Interfaces.Common;
using DameDast.Application.Features.Reminders.Models;
using DameDast.Application.Interfaces.Reminders;

namespace DameDast.Application.Features.Reminders.Queries;

public sealed record GetPushConfigurationQuery : IRequest<PushConfiguration>;
public sealed class GetPushConfigurationQueryHandler(IPushSubscriptionService service) : IRequestHandler<GetPushConfigurationQuery, PushConfiguration>
{
    public Task<PushConfiguration> Handle(GetPushConfigurationQuery request, CancellationToken cancellationToken) =>
        Task.FromResult<PushConfiguration>(service.Configuration);
}
