using System.Text;

namespace DameDast.Domain;

public static class NoteRules
{
    private static readonly string[] Colors = ["default", "sand", "yellow", "sage", "mint", "blue", "lavender", "rose"];
    public static void Validate(PersonalNote note)
    {
        ValidateText(note.Title, note.Body, note.RichText);
        if (note.Drawing is null && note.WhiteboardId is null && string.IsNullOrWhiteSpace(note.Title)
            && string.IsNullOrWhiteSpace(note.Body) && !(note.Checklist?.Any(x => !string.IsNullOrWhiteSpace(x?.Text)) ?? false))
            throw new FinanceException("Add text or a checklist item before saving.");
        if (!Colors.Contains(note.Color) && !string.IsNullOrEmpty(note.Color) || note.Status is not ("active" or "archived" or "trashed")
            || note.NoteType is not (null or "text" or "checklist") || note.Status == "trashed" && note.TrashedAt is null)
            throw new FinanceException("Invalid note settings.");
        if (note.Labels is { } labels && (labels.Count > 30 || labels.Contains(Guid.Empty) || labels.Distinct().Count() != labels.Count))
            throw new FinanceException("Invalid note labels.");
        ValidateIndent(note.Checklist);
        if (note.History is { } history)
        {
            if (history.Count > 40 || history.Any(x => x is null || x.Id == Guid.Empty)
                || history.Select(x => x.Id).Distinct().Count() != history.Count)
                throw new FinanceException("Invalid note history.");
            foreach (var revision in history)
            {
                ValidateText(revision.Title, revision.Body, revision.RichText);
                ValidateIndent(revision.Checklist);
                if (revision.NoteType is not ("text" or "checklist")) throw new FinanceException("Invalid note history.");
            }
        }
        if (note.Reminder is { } reminder) OrganizerRules.Validate(reminder);
    }

    public static void ValidateTransition(PersonalNote? previous, PersonalNote next, DateTimeOffset now)
    {
        if (previous is not { Status: "trashed" }) return;
        if (next.Status != "trashed" && previous.TrashedAt is { } deleted && deleted.AddDays(7) <= now)
            throw new FinanceException("The 7-day recovery window has expired.");
        if (next.Status == "trashed" && previous.TrashedAt != next.TrashedAt)
            throw new FinanceException("The deletion date cannot be changed.");
    }

    public static void ValidateLabel(IReadOnlyList<FinanceRecord> records, Mutation change)
    {
        var label = FinanceRules.Read<NoteLabel>(change.Data);
        if (string.IsNullOrWhiteSpace(label.Name) || label.Name != label.Name.Trim() || label.Name.Length > 40)
            throw new FinanceException("Use a label name from 1 to 40 characters.");
        if (records.Where(x => !x.Deleted && x.Kind == "noteLabel" && x.Id != change.Id)
            .Any(x => Normalize(FinanceRules.Read<NoteLabel>(x.Data).Name) == Normalize(label.Name)))
            throw new FinanceException("This label already exists.");
    }

    private static string Normalize(string name) => string.Join(' ', name.Normalize(NormalizationForm.FormKC)
        .Replace('ي', 'ی').Replace('ك', 'ک').Replace('\u200c', ' ')
        .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)).ToUpperInvariant();

    private static void ValidateText(string? title, string? body, string? richText)
    {
        if (title is null || title.Length > 80 || body is null || body.Length > 4000 || richText is { Length: > 32000 })
            throw new FinanceException("Notes must not exceed 4000 characters.");
    }

    private static void ValidateIndent(IReadOnlyList<ChecklistItem>? items)
    {
        if (items is null) return;
        if (items.Count > 50 || items.Any(x => x is null || x.Id == Guid.Empty || string.IsNullOrWhiteSpace(x.Text)
            || x.Text.Length > 200 || x.Indent is < 0 or > 1) || items.FirstOrDefault()?.Indent == 1
            || items.Select(x => x.Id).Distinct().Count() != items.Count)
            throw new FinanceException("Invalid checklist items.");
    }
}
