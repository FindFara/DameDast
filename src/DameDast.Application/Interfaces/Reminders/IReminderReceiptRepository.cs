namespace DameDast.Application.Interfaces.Reminders;

public interface IReminderReceiptRepository
{
    Task<bool> ExistsAsync(string key, CancellationToken cancellationToken);
    Task RecordAsync(string key, DateTimeOffset sentAt, CancellationToken cancellationToken);
}
