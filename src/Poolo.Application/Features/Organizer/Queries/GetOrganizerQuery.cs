using MediatR;
using Poolo.Application.Features.Organizer.Models;
using Poolo.Application.Interfaces.Common;
using Poolo.Application.Interfaces.FinanceRecords;
using Poolo.Application.Interfaces.Goals;
using Poolo.Application.Interfaces.Notes;
using Poolo.Application.Interfaces.Reminders;
using Poolo.Application.Interfaces.Sessions;
using Poolo.Common;

namespace Poolo.Application.Features.Organizer.Queries;

public sealed record GetOrganizerQuery : IRequest<OrganizerOverview>, IAuthenticatedRequest;

public sealed class GetOrganizerQueryHandler(IFinanceService finance, INoteService notes, IGoalService goals,
    IPersonalReminderService reminders, ICurrentUser user, TimeProvider clock) : IRequestHandler<GetOrganizerQuery, OrganizerOverview>
{
    public async Task<OrganizerOverview> Handle(GetOrganizerQuery request, CancellationToken cancellationToken)
    {
        var snapshot = await finance.ReadAsync(user.RequireId(), cancellationToken);
        var now = clock.UtcNow();
        return new(snapshot.Revision, now, notes.Pinned(snapshot.Records).Concat(goals.Pinned(snapshot.Records))
            .Concat(reminders.Pinned(snapshot.Records)).ToArray(), notes.OpenTasks(snapshot.Records), reminders.Notifications(snapshot.Records, now));
    }
}
