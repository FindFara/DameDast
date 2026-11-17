namespace DameDast.Domain;

public sealed record PersonalNote(string Title, string Body, bool Pinned, DateOnly UpdatedOn, IReadOnlyList<ChecklistItem>? Checklist = null, DrawingDocument? Drawing = null, Guid? WhiteboardId = null, string? WhiteboardPreview = null);

public sealed record ChecklistItem(Guid Id, string Text, bool Done = false, DateOnly? DueDate = null, string? DueTime = null);
