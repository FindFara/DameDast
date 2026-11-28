using DameDast.Application.Features.Administration;

namespace DameDast.Application.Interfaces.Administration;

public interface IAdministrationRepository
{
    Task<UserAccess> EnsureUserAsync(UserIdentity identity, CancellationToken cancellationToken);
    Task<UserPage> UsersAsync(string? search, int page, CancellationToken cancellationToken);
    Task<IReadOnlyList<AdminRole>> RolesAsync(CancellationToken cancellationToken);
    Task SaveUserAsync(SaveUser user, bool create, string actorId, CancellationToken cancellationToken);
    Task SaveRoleAsync(string? originalName, string name, string actorId, CancellationToken cancellationToken);
    Task DeleteRoleAsync(string name, string actorId, CancellationToken cancellationToken);
}
public interface IPageViewRepository
{
    Task IncrementAsync(string page, DateOnly date, long count, CancellationToken cancellationToken);
    Task<PageViewReport> ReportAsync(DateOnly from, DateOnly to, string? page, CancellationToken cancellationToken);
}
public interface IPageViewRecorder
{
    void Record(string page);
}
