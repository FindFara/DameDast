namespace DameDast.Application.Features.Administration;

public static class BuiltInRoles
{
    public const string Admin = "Admin";
    public const string User = "User";
}
public sealed record UserIdentity(string Id, string? Name, string? Email);
public sealed record UserAccess(bool IsActive, string[] Roles);
public sealed record AdminUser(string Id, string Name, string? Email, bool IsActive, DateTimeOffset CreatedAt, DateTimeOffset? LastSeenAt, string[] Roles);
public sealed record AdminRole(string Name, int UserCount, bool IsSystem);
public sealed record UserPage(IReadOnlyList<AdminUser> Items, int Total, int Page, int PageSize);
public sealed record SaveUser(string Id, string Name, string? Email, bool IsActive, string[] Roles);
public sealed record PageViewCount(string Page, long Views);
public sealed record DailyViewCount(DateOnly Date, long Views);
public sealed record PageViewReport(DateOnly From, DateOnly To, long TotalViews, IReadOnlyList<PageViewCount> Pages, IReadOnlyList<DailyViewCount> Daily);
public sealed class AdminForbiddenException : Exception;
