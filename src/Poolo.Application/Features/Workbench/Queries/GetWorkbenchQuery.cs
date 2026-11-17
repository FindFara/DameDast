using MediatR;
using Poolo.Application.Features.Workbench.Models;
using Poolo.Application.Interfaces.Common;
using Poolo.Application.Interfaces.FinanceRecords;
using Poolo.Application.Interfaces.Sessions;
using Poolo.Application.Interfaces.Workbench;

namespace Poolo.Application.Features.Workbench.Queries;

public sealed record GetWorkbenchQuery : IRequest<WorkbenchOverview>, IAuthenticatedRequest;

public sealed class GetWorkbenchQueryHandler(IFinanceService finance, IWorkbenchService workbench, ICurrentUser user)
    : IRequestHandler<GetWorkbenchQuery, WorkbenchOverview>
{
    public async Task<WorkbenchOverview> Handle(GetWorkbenchQuery request, CancellationToken cancellationToken)
    {
        var snapshot = await finance.ReadAsync(user.RequireId(), cancellationToken);
        return new(snapshot.Revision, workbench.Read(snapshot.Records));
    }
}
