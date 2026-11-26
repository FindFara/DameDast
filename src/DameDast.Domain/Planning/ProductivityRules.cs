using System.Text.Json;

namespace DameDast.Domain;

public sealed record Project(string Name, string Description = "");
public sealed record Bookmark(string Title, string Url, string Excerpt, IReadOnlyList<string> Tags, Guid? ProjectId = null);
public sealed record Habit(string Name, int WeeklyTarget, DateOnly StartDate, string Color = "#367c61", IReadOnlyList<int>? Days = null);
public sealed record HabitLog(Guid HabitId, DateOnly Date, bool Done = true);

public static class ProductivityRules
{
    public static void ValidateProject(IReadOnlyList<FinanceRecord> records, Mutation change)
    {
        if (change.Delete || !change.Data.TryGetProperty("projectId", out var value) || value.ValueKind == JsonValueKind.Null) return;
        if (change.Kind is not ("note" or "calendarEvent" or "transaction" or "goal" or "bookmark" or "installment")
            || value.ValueKind != JsonValueKind.String || !value.TryGetGuid(out var id) || !records.Any(r => r.Id == id && r.Kind == "project" && !r.Deleted))
            throw new FinanceException("Choose an existing project.");
    }

    public static bool TryValidate(IReadOnlyList<FinanceRecord> records, Mutation change)
    {
        switch (change.Kind)
        {
            case "project":
                var project = FinanceRules.Read<Project>(change.Data);
                Text(project.Name, 80);
                if (project.Description is null || project.Description.Length > 4000) throw new FinanceException("Enter a valid description.");
                return true;
            case "bookmark":
                var bookmark = FinanceRules.Read<Bookmark>(change.Data);
                Text(bookmark.Title, 200);
                if (bookmark.Url is null || bookmark.Url.Length > 2000 || !Uri.TryCreate(bookmark.Url, UriKind.Absolute, out var url)
                    || url.Scheme is not ("https" or "http") || !string.IsNullOrEmpty(url.UserInfo)
                    || bookmark.Excerpt is null || bookmark.Excerpt.Length > 4000 || bookmark.Tags is null || bookmark.Tags.Count > 12
                    || bookmark.Tags.Any(tag => string.IsNullOrWhiteSpace(tag) || tag.Length > 40)
                    || bookmark.Tags.Distinct().Count() != bookmark.Tags.Count)
                    throw new FinanceException("Enter a valid link, excerpt and tags.");
                return true;
            case "habit":
                var habit = FinanceRules.Read<Habit>(change.Data);
                Text(habit.Name, 80);
                if (habit.WeeklyTarget is < 1 or > 7 || habit.StartDate.Year is < 2000 or > 2100
                    || habit.Color is not ("#367c61" or "#829bc9" or "#bb94c8" or "#db9a81"))
                    throw new FinanceException("Choose a weekly target from 1 to 7.");
                ValidateHabitDays(habit);
                if (records.Any(r => !r.Deleted && r.Kind == "habitLog" && FinanceRules.Read<HabitLog>(r.Data) is var entry && entry.HabitId == change.Id && entry.Date < habit.StartDate))
                    throw new FinanceException("Start date must include the existing habit history.");
                return true;
            case "habitLog":
                var log = FinanceRules.Read<HabitLog>(change.Data);
                var source = records.SingleOrDefault(r => r.Id == log.HabitId && r.Kind == "habit" && !r.Deleted);
                if (source is null || log.Date.Year > 2100 || log.Date < FinanceRules.Read<Habit>(source.Data).StartDate
                    || records.Any(r => !r.Deleted && r.Kind == "habitLog" && r.Id != change.Id && FinanceRules.Read<HabitLog>(r.Data) is var entry && entry.HabitId == log.HabitId && entry.Date == log.Date))
                    throw new FinanceException("This habit date is invalid or already recorded.");
                return true;
            default: return false;
        }
    }

    private static void ValidateHabitDays(Habit habit)
    {
        if (habit.Days is not { } days) return; // Existing habits retain their weekly target until scheduled.
        if (days.Count is < 1 or > 7 || days.Count != habit.WeeklyTarget
            || days.Any(day => day is < 0 or > 6) || days.Distinct().Count() != days.Count)
            throw new FinanceException("Choose at least one weekday.");
    }

    private static void Text(string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > max || value != value.Trim()) throw new FinanceException("Enter a valid title or name.");
    }
}
