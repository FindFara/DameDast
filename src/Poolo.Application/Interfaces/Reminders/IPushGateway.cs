using Poolo.Application.Features.Reminders.Models;

namespace Poolo.Application.Interfaces.Reminders;

public interface IPushGateway
{
    PushConfiguration Configuration { get; }

    Task InitializeAsync(CancellationToken cancellationToken);
    Task<PushDeliveryResult> SendAsync(PushDevice device, PushMessage message, CancellationToken cancellationToken);
}
