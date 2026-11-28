using System.Data;
using DameDast.Application.Features.Administration;
using DameDast.Application.Interfaces.Administration;
using DameDast.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace DameDast.Infrastructure.Persistence.Repositories;

public sealed class AdministrationRepository(IDbContextFactory<FinanceDb> factory, TimeProvider time) : IAdministrationRepository
{
    public async Task<UserAccess> EnsureUserAsync(UserIdentity identity, CancellationToken ct)
    {
        var id = Required(identity.Id, 256, "User ID");
        var name = string.IsNullOrWhiteSpace(identity.Name) ? id[..Math.Min(id.Length, 200)] : identity.Name[..Math.Min(identity.Name.Length, 200)];
        var email = identity.Email is { Length: <= 320 } ? identity.Email : null;
        var now = time.GetUtcNow();
        await using var db = await factory.CreateDbContextAsync(ct);
        // An insert and default membership commit together; concurrent first requests are safe.
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var inserted = await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "Users" ("Id", "Name", "Email", "IsActive", "CreatedAt", "LastSeenAt")
            VALUES ({id}, {name}, {email}, TRUE, {now}, {now}) ON CONFLICT ("Id") DO NOTHING
            """, ct);
        if (inserted > 0)
            await db.Database.ExecuteSqlInterpolatedAsync($"""INSERT INTO "UserRoles" ("UserId", "RoleName") VALUES ({id}, 'User') ON CONFLICT DO NOTHING""", ct);
        else
            await db.Users.Where(x => x.Id == id && (x.LastSeenAt == null || x.LastSeenAt < now.AddMinutes(-5)))
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.LastSeenAt, now), ct);
        // Existing cookies and migrated users gain profile data once, without overwriting admin edits.
        if (email is not null)
            await db.Users.Where(x => x.Id == id && x.Email == null).ExecuteUpdateAsync(s => s.SetProperty(x => x.Email, email).SetProperty(x => x.Name, name), ct);
        var user = await db.Users.AsNoTracking().Include(x => x.Roles).SingleAsync(x => x.Id == id, ct);
        await tx.CommitAsync(ct);
        return new(user.IsActive, user.Roles.Select(x => x.RoleName).ToArray());
    }

    public async Task<UserPage> UsersAsync(string? search, int page, CancellationToken ct)
    {
        page = Math.Clamp(page, 1, 1000000);
        await using var db = await factory.CreateDbContextAsync(ct);
        var query = db.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            search = search.Trim();
            if (search.Length > 200) throw new FinanceException("Search is too long.");
            query = query.Where(x => x.Id.Contains(search) || x.Name.Contains(search) || (x.Email != null && x.Email.Contains(search)));
        }
        var total = await query.CountAsync(ct);
        var rows = await query.Include(x => x.Roles).OrderByDescending(x => x.CreatedAt).ThenBy(x => x.Id).Skip((page - 1) * 30).Take(30).ToArrayAsync(ct);
        return new(rows.Select(x => new AdminUser(x.Id, x.Name, x.Email, x.IsActive, x.CreatedAt, x.LastSeenAt, x.Roles.Select(r => r.RoleName).Order().ToArray())).ToArray(), total, page, 30);
    }

    public async Task<IReadOnlyList<AdminRole>> RolesAsync(CancellationToken ct)
    {
        await using var db = await factory.CreateDbContextAsync(ct);
        return await db.Roles.AsNoTracking().OrderBy(x => x.Name)
            .Select(x => new AdminRole(x.Name, db.UserRoles.Count(r => r.RoleName == x.Name), x.IsSystem)).ToArrayAsync(ct);
    }

    public async Task SaveUserAsync(SaveUser input, bool create, string actorId, CancellationToken ct)
    {
        var id = Required(input.Id, 256, "User ID");
        var name = Required(input.Name, 200, "Name");
        var email = string.IsNullOrWhiteSpace(input.Email) ? null : Required(input.Email, 320, "Email");
        if (email is not null && !System.Net.Mail.MailAddress.TryCreate(email, out _)) throw new FinanceException("Enter a valid email.");
        if (input.Roles is null || input.Roles.Length > 50) throw new FinanceException("Choose valid roles.");
        var roles = input.Roles.Distinct(StringComparer.Ordinal).ToArray();
        await using var db = await factory.CreateDbContextAsync(ct);
        await using var tx = await LockAsync(db, ct);
        await RequireActorAsync(db, actorId, ct);
        if (await db.Roles.CountAsync(x => roles.Contains(x.Name), ct) != roles.Length) throw new FinanceException("A selected role no longer exists.");
        var user = await db.Users.Include(x => x.Roles).SingleOrDefaultAsync(x => x.Id == id, ct);
        if (create && user is not null) throw new FinanceException("This user already exists.");
        if (!create && user is null) throw new FinanceException("User not found.");
        if (id == actorId && (!input.IsActive || !roles.Contains(BuiltInRoles.Admin))) throw new FinanceException("You cannot disable your own account or remove your own Admin role.");
        if (user is null)
        {
            user = new AppUser { Id = id, Name = name, CreatedAt = time.GetUtcNow() };
            db.Users.Add(user);
        }
        user.Name = name; user.Email = email; user.IsActive = input.IsActive;
        db.UserRoles.RemoveRange(user.Roles.Where(x => !roles.Contains(x.RoleName)));
        foreach (var role in roles.Where(r => user.Roles.All(x => x.RoleName != r)))
            user.Roles.Add(new AppUserRole { UserId = id, RoleName = role });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    public async Task SaveRoleAsync(string? originalName, string name, string actorId, CancellationToken ct)
    {
        name = Required(name, 64, "Role name");
        if (name.Contains('/') || name.Contains('\\')) throw new FinanceException("Role names cannot contain slashes.");
        var normalized = name.ToUpperInvariant();
        await using var db = await factory.CreateDbContextAsync(ct);
        await using var tx = await LockAsync(db, ct);
        await RequireActorAsync(db, actorId, ct);
        var existing = originalName is null ? null : await db.Roles.SingleOrDefaultAsync(x => x.Name == originalName, ct);
        if (originalName is not null && existing is null) throw new FinanceException("Role not found.");
        if (existing?.IsSystem == true) throw new FinanceException("Built-in roles cannot be renamed.");
        if (await db.Roles.AnyAsync(x => x.NormalizedName == normalized && x.Name != originalName, ct)) throw new FinanceException("A role with this name already exists.");
        if (originalName == name) { await tx.CommitAsync(ct); return; }
        if (existing is not null)
        {
            existing.NormalizedName = "__rename_" + Guid.NewGuid().ToString("N");
            await db.SaveChangesAsync(ct);
        }
        db.Roles.Add(new AppRole { Name = name, NormalizedName = normalized });
        // Remove old membership before removing the old role. Its key is immutable.
        if (existing is not null)
        {
            var members = await db.UserRoles.Where(x => x.RoleName == originalName).ToArrayAsync(ct);
            db.UserRoles.RemoveRange(members);
            db.Roles.Remove(existing);
            await db.SaveChangesAsync(ct);
            foreach (var member in members) db.UserRoles.Add(new AppUserRole { UserId = member.UserId, RoleName = name });
        }
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    public async Task DeleteRoleAsync(string name, string actorId, CancellationToken ct)
    {
        await using var db = await factory.CreateDbContextAsync(ct);
        await using var tx = await LockAsync(db, ct);
        await RequireActorAsync(db, actorId, ct);
        var role = await db.Roles.SingleOrDefaultAsync(x => x.Name == name, ct) ?? throw new FinanceException("Role not found.");
        if (role.IsSystem) throw new FinanceException("Built-in roles cannot be deleted.");
        if (await db.UserRoles.AnyAsync(x => x.RoleName == name, ct)) throw new FinanceException("Remove this role from its users before deleting it.");
        db.Roles.Remove(role);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    public async Task BootstrapAsync(IEnumerable<string> ids, CancellationToken ct)
    {
        foreach (var raw in ids.Distinct(StringComparer.Ordinal))
        {
            var id = Required(raw, 256, "Admin user ID");
            await EnsureUserAsync(new(id, null, null), ct);
            await using var db = await factory.CreateDbContextAsync(ct);
            await db.Database.ExecuteSqlInterpolatedAsync($"""INSERT INTO "UserRoles" ("UserId", "RoleName") VALUES ({id}, 'Admin') ON CONFLICT DO NOTHING""", ct);
        }
    }

    private static async Task<IDbContextTransaction> LockAsync(FinanceDb db, CancellationToken ct)
    {
        var tx = await db.Database.BeginTransactionAsync(IsolationLevel.ReadCommitted, ct);
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(713461)", ct);
        return tx;
    }
    private static async Task RequireActorAsync(FinanceDb db, string actorId, CancellationToken ct)
    {
        if (!await db.Users.AnyAsync(x => x.Id == actorId && x.IsActive && x.Roles.Any(r => r.RoleName == BuiltInRoles.Admin), ct)) throw new AdminForbiddenException();
    }
    private static string Required(string? value, int max, string label)
    {
        value = value?.Trim();
        if (string.IsNullOrEmpty(value) || value.Length > max || value.Any(char.IsControl)) throw new FinanceException($"{label} must contain 1–{max} characters.");
        return value;
    }
}
