using System.Globalization;

namespace DameDast.Domain;

public sealed record CalendarEntry(string Title, string Description, DateOnly StartDate, DateOnly EndDate,
    bool AllDay = true, string? StartTime = null, string? EndTime = null, string Kind = "event", bool Done = false,
    string Color = "#72ab95", string Repeat = "none", DateOnly? RepeatUntil = null, string RepeatCalendar = "persian",
    IReadOnlyList<DateOnly>? CompletedDates = null);

public static class CalendarRules
{
    public static void Validate(CalendarEntry entry)
    {
        if (string.IsNullOrWhiteSpace(entry.Title) || entry.Title.Length > 120 || entry.Title != entry.Title.Trim()
            || entry.Description is null || entry.Description.Length > 4000
            || entry.StartDate.Year is < 2000 or > 2100 || entry.EndDate < entry.StartDate
            || entry.EndDate.DayNumber - entry.StartDate.DayNumber > 31 || entry.EndDate.Year > 2100
            || entry.Kind is not ("event" or "task") || entry.Repeat is not ("none" or "daily" or "weekly" or "monthly")
            || entry.RepeatCalendar is not ("persian" or "gregory")
            || entry.RepeatUntil is { } until && (until < entry.StartDate || until.Year > 2100)
            || entry.Color is null || entry.Color.Length != 7 || entry.Color[0] != '#' || entry.Color.AsSpan(1).IndexOfAnyExcept("0123456789abcdefABCDEF") >= 0
            || entry.CompletedDates is { } dates && (dates.Count > 500 || dates.Distinct().Count() != dates.Count || dates.Any(d => d < entry.StartDate || d.Year > 2100)))
            throw new FinanceException("Enter a valid calendar event.");
        if (!entry.AllDay && (!TimeOnly.TryParseExact(entry.StartTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var start)
            || !TimeOnly.TryParseExact(entry.EndTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var end)
            || entry.StartDate == entry.EndDate && end <= start))
            throw new FinanceException("End time must follow start time.");
    }
}
