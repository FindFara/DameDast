namespace DameDast.Domain;

public sealed record PersonalReminder(string Title, string Body, DateOnly StartDate, IReadOnlyList<string> Times,
    string Repeat = "once", int Interval = 1, DateOnly? EndDate = null, int? MaxOccurrences = null,
    bool Pinned = false, bool Completed = false, string TimeZone = "Asia/Tehran");
public sealed record NotificationRead(Guid SourceId, string Occurrence, string? ItemKey = null);
public sealed record ReminderOccurrence(string Occurrence, DateTimeOffset DueAt);
