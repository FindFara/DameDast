using Poolo.Domain;

namespace Poolo.Application.Features.Organizer.Models;

public sealed record OrganizerNotification(Guid SourceId, string Occurrence, string? ItemKey, string Title,
    string Kind, string Url, DateTimeOffset DueAt, bool Read);
public sealed record OrganizerOverview(long Revision, DateTimeOffset Now, IReadOnlyList<FinanceRecord> Pinned,
    int OpenTasks, IReadOnlyList<OrganizerNotification> Notifications);
