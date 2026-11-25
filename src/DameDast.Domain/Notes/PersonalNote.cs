using System.Text.Json;
using System.Text.Json.Serialization;

namespace DameDast.Domain;

public sealed record PersonalNote(string Title, string Body, bool Pinned, DateOnly UpdatedOn,
    IReadOnlyList<ChecklistItem>? Checklist = null, DrawingDocument? Drawing = null,
    Guid? WhiteboardId = null, string? WhiteboardPreview = null, Guid? ProjectId = null,
    string? RichText = null, string? NoteType = null, string Color = "default",
    IReadOnlyList<Guid>? Labels = null, string Status = "active", DateTimeOffset? TrashedAt = null,
    DateTimeOffset? CreatedAt = null, DateTimeOffset? EditedAt = null,
    IReadOnlyList<NoteRevision>? History = null, PersonalReminder? Reminder = null)
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement>? ExtensionData { get; init; }
}

public sealed record ChecklistItem(Guid Id, string Text, bool Done = false, DateOnly? DueDate = null,
    string? DueTime = null, int Indent = 0);
public sealed record NoteLabel(string Name);
public sealed record NoteRevision(Guid Id, DateTimeOffset SavedAt, string Title, string Body,
    string? RichText = null, string NoteType = "text", IReadOnlyList<ChecklistItem>? Checklist = null);
