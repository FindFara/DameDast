using MediatR;
using DameDast.Application.Features.Workbench.Models;
using DameDast.Application.Interfaces.Common;
using DameDast.Application.Interfaces.FinanceRecords;
using DameDast.Application.Interfaces.Sessions;
using DameDast.Application.Interfaces.Workbench;

namespace DameDast.Application.Features.Workbench.Queries;

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
