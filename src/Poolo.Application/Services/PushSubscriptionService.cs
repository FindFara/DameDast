using Poolo.Application.Interfaces.FinanceRecords;
using Poolo.Application.Interfaces.Market;
using Poolo.Application.Interfaces.Reminders;
using Poolo.Application.Features.Reminders.Models;
using Poolo.Domain;

namespace Poolo.Application.Services;

public sealed class PushSubscriptionService(IPushSubscriptionRepository repository, IPushGateway gateway) : IPushSubscriptionService
{
    public PushConfiguration Configuration => gateway.Configuration;

    public Task RegisterAsync(string userId, PushRegistration input, CancellationToken cancellationToken)
    {
        if (!Configuration.Configured)
            throw new FinanceException("Push notifications are not enabled on this server.");
        PushRegistrationRules.Validate(input);
        return repository.UpsertAsync(userId, input, cancellationToken);
    }

    public Task RemoveAsync(string userId, string endpoint, CancellationToken cancellationToken) => repository.RemoveAsync(userId, endpoint, cancellationToken);
}
