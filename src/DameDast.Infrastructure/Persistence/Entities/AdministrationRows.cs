namespace DameDast.Infrastructure;

public sealed class AppUser
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    public string? Email { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? LastSeenAt { get; set; }
    public List<AppUserRole> Roles { get; set; } = [];
}
public sealed class AppRole
{
    public required string Name { get; set; }
    public required string NormalizedName { get; set; }
    public bool IsSystem { get; set; }
}
public sealed class AppUserRole
{
    public required string UserId { get; set; }
    public required string RoleName { get; set; }
}
public sealed class PageViewDaily
{
    public required string Page { get; set; }
    public DateOnly Date { get; set; }
    public long Views { get; set; }
}
