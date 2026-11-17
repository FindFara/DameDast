using DameDast.Application.Interfaces.FinanceRecords;
using DameDast.Application.Interfaces.Market;
using DameDast.Application.Interfaces.Reminders;
using DameDast.Application.Features.Reminders.Models;
using DameDast.Domain;

namespace DameDast.Application.Services;

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
