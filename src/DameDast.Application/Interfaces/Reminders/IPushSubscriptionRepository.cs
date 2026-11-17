using DameDast.Application.Features.Reminders.Models;

namespace DameDast.Application.Interfaces.Reminders;

public interface IPushSubscriptionRepository
{
    Task UpsertAsync(string userId, PushRegistration registration, CancellationToken cancellationToken);
    Task RemoveAsync(string userId, string endpoint, CancellationToken cancellationToken);
    Task<IReadOnlyList<PushDevice>> ReadAllAsync(CancellationToken cancellationToken);
}
