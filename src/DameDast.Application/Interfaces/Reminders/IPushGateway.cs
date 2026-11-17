using DameDast.Application.Features.Reminders.Models;

namespace DameDast.Application.Interfaces.Reminders;

public interface IPushGateway
{
    PushConfiguration Configuration { get; }

    Task InitializeAsync(CancellationToken cancellationToken);
    Task<PushDeliveryResult> SendAsync(PushDevice device, PushMessage message, CancellationToken cancellationToken);
}
