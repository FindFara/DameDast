using Poolo.Domain;
using Poolo.Application.Features.Organizer.Models;

namespace Poolo.Application.Interfaces.Reminders;

public interface IPersonalReminderService
{
    IReadOnlyList<FinanceRecord> Pinned(IReadOnlyList<FinanceRecord> records);
    IReadOnlyList<OrganizerNotification> Notifications(IReadOnlyList<FinanceRecord> records, DateTimeOffset now);
}
