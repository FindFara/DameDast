namespace DameDast.Domain;

public sealed record DevelopmentEntry(DateOnly Date, string Area, string Title, int Minutes, string Notes, bool Done, Guid? ResourceId = null);

public static class DevelopmentRules
{
    public static bool TryValidate(IReadOnlyList<FinanceRecord> records, Mutation change)
    {
        if (change.Kind != "developmentEntry") return false;
        var entry = FinanceRules.Read<DevelopmentEntry>(change.Data);
        if (entry.Date.Year is < 2000 or > 2100 || entry.Area is not ("study" or "exercise" or "essay" or "vocabulary" or "lesson" or "plan")
            || string.IsNullOrWhiteSpace(entry.Title) || entry.Title.Length > 120
            || entry.Minutes is < 0 or > 1440 || entry.Notes is null || entry.Notes.Length > 4000)
            throw new FinanceException("Enter a title, date and duration from 0 to 1440 minutes.");
        if (entry.Area == "lesson" && entry.ResourceId is null) throw new FinanceException("Choose an existing lesson.");
        if (entry.ResourceId is Guid resource && (entry.Area != "lesson" || !records.Any(r => !r.Deleted && r.Id == resource && r.Kind == "languageLesson")))
            throw new FinanceException("Choose an existing lesson.");
        return true;
    }
}
