using System.Globalization;
using Poolo.Common;

namespace Poolo.Domain;

public static class OrganizerRules
{
    public static bool TryValidate(IReadOnlyList<FinanceRecord> records, Mutation change)
    {
        if (change.Kind == "note")
        {
            var note = FinanceRules.Read<PersonalNote>(change.Data);
            if (note.WhiteboardId == Guid.Empty || note.WhiteboardPreview is { } preview &&
                (preview.Length > 120000 || !System.Text.RegularExpressions.Regex.IsMatch(preview, "^data:image/png;base64,[A-Za-z0-9+/=]+$")))
                throw new FinanceException("Invalid whiteboard preview.");
            if (note.Drawing is not null) DrawingRules.Validate(note.Drawing);
            if (System.Text.Encoding.UTF8.GetByteCount(change.Data.GetRawText()) > 750_000)
                throw new FinanceException("Drawing note is too large.");
            var checklist = note.Checklist;
            if (checklist is not null && (checklist.Count > 50 || checklist.Any(x => x is null || x.Id == Guid.Empty
                || string.IsNullOrWhiteSpace(x.Text) || x.Text.Length > 200 || x.Text != x.Text.Trim())
                || checklist.Select(x => x.Id).Distinct().Count() != checklist.Count))
                throw new FinanceException("Use up to 50 unique tasks, with text up to 200 characters.");
            if (checklist is not null && checklist.Any(x => x.DueDate is { Year: < 2000 or > 2100 }
                || x.DueTime is not null && (x.DueDate is null || !TimeOnly.TryParseExact(x.DueTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))))
                throw new FinanceException("Choose a valid task date and time.");
            return false;
        }
        if (change.Kind == "reminder")
        {
            Validate(FinanceRules.Read<PersonalReminder>(change.Data));
            return true;
        }
        if (change.Kind == "notificationRead")
        {
            var receipt = FinanceRules.Read<NotificationRead>(change.Data);
            var source = records.FirstOrDefault(x => x.Id == receipt.SourceId);
            if (source is null || source.Kind is not ("reminder" or "installment" or "externalSnapshot" or "goal")
                || !DateTime.TryParseExact(receipt.Occurrence, "yyyy-MM-dd'T'HH:mm", CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out _)
                || receipt.ItemKey is { Length: > 128 }
                || source.Kind != "externalSnapshot" && receipt.ItemKey is not null)
                throw new FinanceException("Invalid notification receipt.");
            return true;
        }
        return false;
    }

    public static void Validate(PersonalReminder reminder)
    {
        var maxInterval = reminder.Repeat switch { "weekly" => 52, "monthly" => 12, _ => 365 };
        if (string.IsNullOrWhiteSpace(reminder.Title) || reminder.Title.Length > 80 || reminder.Title != reminder.Title.Trim()
            || reminder.Body is null || reminder.Body.Length > 4000
            || reminder.StartDate.Year is < 2000 or > 2100
            || reminder.EndDate is { } end && (end < reminder.StartDate || end.Year > 2100)
            || reminder.Repeat is not ("once" or "daily" or "weekly" or "monthly")
            || reminder.Interval < 1 || reminder.Interval > maxInterval
            || reminder.MaxOccurrences is < 1 or > 10000
            || reminder.Times is null || reminder.Times.Count is < 1 or > 12
            || reminder.Times.Distinct().Count() != reminder.Times.Count
            || reminder.Times.Any(time => !TimeOnly.TryParseExact(time, "HH:mm", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out _)))
            throw new FinanceException("Enter a valid reminder date, times and repeat schedule.");
    }

    public static IReadOnlyList<ReminderOccurrence> DueOccurrences(PersonalReminder reminder, DateTimeOffset now, int days = 7)
    {
        if (reminder.Completed) return [];
        var today = DateOnly.FromDateTime(Time.ToTehran(now).DateTime);
        var first = today.AddDays(-Math.Clamp(days, 1, 7) + 1);
        var result = new List<ReminderOccurrence>();
        for (var date = first; date <= today; date = date.AddDays(1))
        {
            var sequence = SequenceOn(reminder, date);
            if (sequence is null) continue;
            var times = reminder.Times.Order(StringComparer.Ordinal).ToArray();
            for (var index = 0; index < times.Length; index++)
            {
                if (reminder.MaxOccurrences is { } limit && sequence.Value * times.Length + index >= limit) continue;
                var due = Time.TehranAt(date, TimeOnly.ParseExact(times[index], "HH:mm", CultureInfo.InvariantCulture));
                if (due > now) continue;
                result.Add(new($"{date:yyyy-MM-dd}T{times[index]}", due));
            }
        }
        return result;
    }

    private static int? SequenceOn(PersonalReminder reminder, DateOnly date)
    {
        if (date < reminder.StartDate || reminder.EndDate is { } end && date > end) return null;
        var distance = date.DayNumber - reminder.StartDate.DayNumber;
        if (reminder.Repeat == "once") return distance == 0 ? 0 : null;
        var step = reminder.Interval * (reminder.Repeat == "weekly" ? 7 : 1);
        if (reminder.Repeat != "monthly") return distance % step == 0 ? distance / step : null;
        var months = SolarCalendar.MonthDistance(reminder.StartDate, date);
        return months % reminder.Interval == 0 && SolarCalendar.AddMonths(reminder.StartDate, months) == date
            ? months / reminder.Interval : null;
    }
}
