using MediatR;
using DameDast.Application.Features.Organizer.Models;
using DameDast.Application.Interfaces.Common;
using DameDast.Application.Interfaces.FinanceRecords;
using DameDast.Application.Interfaces.Goals;
using DameDast.Application.Interfaces.Notes;
using DameDast.Application.Interfaces.Reminders;
using DameDast.Application.Interfaces.Sessions;
using DameDast.Common;

namespace DameDast.Application.Features.Organizer.Queries;

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
