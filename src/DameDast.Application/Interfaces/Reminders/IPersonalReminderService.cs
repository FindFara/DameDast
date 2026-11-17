using DameDast.Domain;
using DameDast.Application.Features.Organizer.Models;

namespace DameDast.Application.Interfaces.Reminders;

public interface IPersonalReminderService
{
    IReadOnlyList<FinanceRecord> Pinned(IReadOnlyList<FinanceRecord> records);
    IReadOnlyList<OrganizerNotification> Notifications(IReadOnlyList<FinanceRecord> records, DateTimeOffset now);
}
