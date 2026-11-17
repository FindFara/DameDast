using Poolo.Application.Features.Reminders.Models;

namespace Poolo.Application.Interfaces.Reminders;

public interface IPushSubscriptionService
{
    PushConfiguration Configuration { get; }

    Task RegisterAsync(string userId, PushRegistration input, CancellationToken cancellationToken);
    Task RemoveAsync(string userId, string endpoint, CancellationToken cancellationToken);
}
