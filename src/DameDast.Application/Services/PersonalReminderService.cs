using DameDast.Application.Features.Organizer.Models;
using DameDast.Application.Interfaces.Reminders;
using DameDast.Common;
using DameDast.Domain;

namespace DameDast.Application.Services;

public sealed class PersonalReminderService : IPersonalReminderService
{
    public IReadOnlyList<FinanceRecord> Pinned(IReadOnlyList<FinanceRecord> records) => records
        .Where(x => !x.Deleted && x.Kind == "reminder" && FinanceRules.Read<PersonalReminder>(x.Data).Pinned).ToArray();

    public IReadOnlyList<OrganizerNotification> Notifications(IReadOnlyList<FinanceRecord> records, DateTimeOffset now)
    {
        var reads = records.Where(x => !x.Deleted && x.Kind == "notificationRead")
            .Select(x => FinanceRules.Read<NotificationRead>(x.Data)).ToHashSet();
        var result = new List<OrganizerNotification>();
        var today = DateOnly.FromDateTime(Time.ToTehran(now).DateTime);
        foreach (var record in records.Where(x => !x.Deleted))
        {
            if (record.Kind == "reminder")
            {
                var reminder = FinanceRules.Read<PersonalReminder>(record.Data);
                foreach (var occurrence in OrganizerRules.DueOccurrences(reminder, now))
                    Add(record, occurrence.Occurrence, null, reminder.Title, "reminder", "/#reminders", occurrence.DueAt);
            }
            else if (record.Kind == "note")
            {
                var note = FinanceRules.Read<PersonalNote>(record.Data);
                if (note.Status == "trashed" || note.Reminder is not { } reminder) continue;
                foreach (var occurrence in OrganizerRules.DueOccurrences(reminder, now))
                    Add(record, occurrence.Occurrence, null, string.IsNullOrWhiteSpace(note.Title) ? reminder.Title : note.Title, "note", $"/#note/{record.Id}", occurrence.DueAt);
            }
            else if (record.Kind == "installment")
            {
                var installment = FinanceRules.Read<Installment>(record.Data);
                if (InstallmentReminderRules.IsDue(installment, today))
                    Add(record, $"{installment.DueDate:yyyy-MM-dd}T00:00", null, installment.Title, "installment", "/#installments", Time.TehranAt(installment.DueDate, TimeOnly.MinValue));
            }
            else if (record.Kind == "externalSnapshot")
            {
                var snapshot = FinanceRules.Read<ExternalSnapshot>(record.Data);
                if (snapshot.Category != "installments") continue;
                foreach (var item in snapshot.Items.Where(x => x.Status == "unpaid" && x.DueDate.HasValue))
                    if (InstallmentReminderRules.IsDue(new Installment(item.Label, 0, item.DueDate!.Value, false, 3), today))
                        Add(record, $"{item.DueDate.Value:yyyy-MM-dd}T00:00", item.Key, item.Label, "installment", "/#connected", Time.TehranAt(item.DueDate.Value, TimeOnly.MinValue));
            }
            else if (record.Kind == "goal")
            {
                var goal = FinanceRules.Read<Goal>(record.Data);
                if (goal.Saved < goal.Target && goal.Deadline is { } deadline && deadline <= today && deadline >= today.AddDays(-7))
                    Add(record, $"{deadline:yyyy-MM-dd}T00:00", null, goal.Name, "goal", "/#goals", Time.TehranAt(deadline, TimeOnly.MinValue));
            }
        }
        return result.OrderByDescending(x => x.DueAt).ToArray();

        void Add(FinanceRecord source, string occurrence, string? itemKey, string title, string kind, string url, DateTimeOffset due) =>
            result.Add(new(source.Id, occurrence, itemKey, title, kind, url, due,
                reads.Contains(new NotificationRead(source.Id, occurrence, itemKey))));
    }
}
