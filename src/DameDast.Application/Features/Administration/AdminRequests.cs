using DameDast.Application.Interfaces.Administration;
using DameDast.Application.Interfaces.Common;
using DameDast.Application.Interfaces.Sessions;
using MediatR;

namespace DameDast.Application.Features.Administration;

public interface IAdminRequest : IAuthenticatedRequest;
public sealed record GetUsersQuery(string? Search, int Page = 1) : IRequest<UserPage>, IAdminRequest;
public sealed record GetRolesQuery : IRequest<IReadOnlyList<AdminRole>>, IAdminRequest;
public sealed record SaveUserCommand(SaveUser User, bool Create) : IRequest, IAdminRequest;
public sealed record SaveRoleCommand(string? OriginalName, string Name) : IRequest, IAdminRequest;
public sealed record DeleteRoleCommand(string Name) : IRequest, IAdminRequest;
public sealed record GetPageViewsQuery(DateOnly From, DateOnly To, string? Page = null) : IRequest<PageViewReport>, IAdminRequest;

public sealed class AdminHandlers(IAdministrationRepository repository, IPageViewRepository views, ICurrentUser user) :
    IRequestHandler<GetUsersQuery, UserPage>, IRequestHandler<GetRolesQuery, IReadOnlyList<AdminRole>>,
    IRequestHandler<SaveUserCommand>, IRequestHandler<SaveRoleCommand>, IRequestHandler<DeleteRoleCommand>,
    IRequestHandler<GetPageViewsQuery, PageViewReport>
{
    public Task<UserPage> Handle(GetUsersQuery request, CancellationToken ct) => repository.UsersAsync(request.Search, request.Page, ct);
    public Task<IReadOnlyList<AdminRole>> Handle(GetRolesQuery request, CancellationToken ct) => repository.RolesAsync(ct);
    public Task Handle(SaveUserCommand request, CancellationToken ct) => repository.SaveUserAsync(request.User, request.Create, user.RequireId(), ct);
    public Task Handle(SaveRoleCommand request, CancellationToken ct) => repository.SaveRoleAsync(request.OriginalName, request.Name, user.RequireId(), ct);
    public Task Handle(DeleteRoleCommand request, CancellationToken ct) => repository.DeleteRoleAsync(request.Name, user.RequireId(), ct);
    public Task<PageViewReport> Handle(GetPageViewsQuery request, CancellationToken ct)
    {
        if (request.To < request.From || request.To.DayNumber - request.From.DayNumber > 365)
            throw new DameDast.Domain.FinanceException("Choose a date range of at most 366 days.");
        return views.ReportAsync(request.From, request.To, request.Page, ct);
    }
}
