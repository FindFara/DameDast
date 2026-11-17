namespace DameDast.Application.Interfaces.Reminders;

public interface IReminderService
{
    Task SendDueAsync(CancellationToken cancellationToken);
}
