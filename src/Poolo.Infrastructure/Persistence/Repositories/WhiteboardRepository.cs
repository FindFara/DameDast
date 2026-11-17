using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Poolo.Application.Interfaces.Whiteboards;
using Poolo.Common;
using Poolo.Domain;

namespace Poolo.Infrastructure.Persistence.Repositories;

public sealed class WhiteboardRepository(IDbContextFactory<FinanceDb> factory, TimeProvider clock) : IWhiteboardRepository
{
    public async Task<WhiteboardAccess> ReadAsync(Guid id, string? userId, string? token, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        var row = await db.Whiteboards.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        var role = await AuthorizeAsync(db, id, row, userId, token, cancellationToken);
        return new(ReadState(row), role, row is not null);
    }

    public async Task<WhiteboardState> ApplyAsync(Guid id, string? userId, string? token, WhiteboardPatch patch, CancellationToken cancellationToken)
    {
        for (var attempt = 0; ; attempt++)
        {
            try { return await ApplyOnceAsync(id, userId, token, patch, cancellationToken); }
            catch (DbUpdateConcurrencyException) when (attempt < 4) { }
            catch (DbUpdateException e) when (attempt < 4 && e.InnerException is SqliteException { SqliteErrorCode: 5 or 6 or 19 }) { }
            catch (SqliteException e) when (attempt < 4 && e.SqliteErrorCode is 5 or 6) { }
            await Task.Delay(TimeSpan.FromMilliseconds(40 * (attempt + 1)), cancellationToken);
        }
    }

    private async Task<WhiteboardState> ApplyOnceAsync(Guid id, string? userId, string? token, WhiteboardPatch patch, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var row = await db.Whiteboards.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        var role = await AuthorizeAsync(db, id, row, userId, token, cancellationToken);
        if (role == "view") throw new UnauthorizedAccessException();
        var digest = Hash(JsonSerializer.Serialize(patch, FinanceRules.Json));
        var receipt = await db.WhiteboardOperations.SingleOrDefaultAsync(x => x.DocumentId == id && x.OperationId == patch.OperationId, cancellationToken);
        if (receipt is not null)
        {
            if (receipt.Digest != digest) throw new FinanceException("Operation identifier reused with different content.");
            return ReadState(row);
        }
        var state = WhiteboardRules.Apply(ReadState(row), patch);
        if (row is null)
        {
            row = new() { Id = id, OwnerId = userId!, State = "" };
            db.Whiteboards.Add(row);
        }
        row.Revision = state.Revision;
        row.State = JsonSerializer.Serialize(state, FinanceRules.Json);
        row.UpdatedAt = clock.UtcNow().ToUnixTimeMilliseconds();
        db.WhiteboardOperations.Add(new() { DocumentId = id, OperationId = patch.OperationId, Digest = digest });
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return state;
    }

    public async Task<WhiteboardGrant> ShareAsync(Guid id, string userId, string role, CancellationToken cancellationToken)
    {
        if (role is not ("view" or "edit")) throw new FinanceException("Invalid sharing role.");
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        var row = await db.Whiteboards.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.OwnerId == userId, cancellationToken)
            ?? throw new UnauthorizedAccessException();
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        var expires = clock.UtcNow().AddDays(7);
        var share = new WhiteboardShare { Id = Guid.NewGuid(), DocumentId = row.Id, Role = role, TokenHash = Hash(token), ExpiresAt = expires.ToUnixTimeMilliseconds() };
        db.WhiteboardShares.Add(share);
        await db.SaveChangesAsync(cancellationToken);
        return new(share.Id, token, role, expires);
    }

    public async Task RevokeAsync(Guid id, string userId, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        if (!await db.Whiteboards.AnyAsync(x => x.Id == id && x.OwnerId == userId, cancellationToken)) throw new UnauthorizedAccessException();
        await db.WhiteboardShares.Where(x => x.DocumentId == id).ExecuteUpdateAsync(update => update.SetProperty(x => x.Revoked, true), cancellationToken);
    }

    public async Task<JsonElement> ReadLibraryAsync(string userId, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        var row = await db.WhiteboardLibraries.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        return JsonSerializer.SerializeToElement(new { revision = row?.Revision ?? 0, items = JsonSerializer.Deserialize<JsonElement>(row?.Items ?? "[]") }, FinanceRules.Json);
    }

    public async Task SaveLibraryAsync(string userId, JsonElement input, CancellationToken cancellationToken)
    {
        if (!input.TryGetProperty("items", out var items) || items.ValueKind != JsonValueKind.Array || items.GetArrayLength() > 500 ||
            Encoding.UTF8.GetByteCount(items.GetRawText()) > 2_000_000 || !input.TryGetProperty("expectedVersion", out var expected))
            throw new FinanceException("Invalid component library.");
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        var row = await db.WhiteboardLibraries.SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (expected.GetInt64() != (row?.Revision ?? 0)) throw new FinanceException("The component library changed on another device.");
        if (row is null) { row = new() { UserId = userId, Items = "[]" }; db.WhiteboardLibraries.Add(row); }
        row.Items = items.GetRawText(); row.Revision++;
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<string> AuthorizeAsync(FinanceDb db, Guid id, WhiteboardRow? row, string? userId, string? token, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty) throw new FinanceException("Invalid document identifier.");
        if (!string.IsNullOrWhiteSpace(userId) && (row is null || row.OwnerId == userId)) return "owner";
        if (row is null || token is null || token.Length != 64) throw new UnauthorizedAccessException();
        var hash = Hash(token);
        var share = await db.WhiteboardShares.AsNoTracking().SingleOrDefaultAsync(x => x.DocumentId == id && x.TokenHash == hash && !x.Revoked, cancellationToken);
        if (share is null || share.ExpiresAt <= clock.UtcNow().ToUnixTimeMilliseconds()) throw new UnauthorizedAccessException();
        return share.Role;
    }

    private static WhiteboardState ReadState(WhiteboardRow? row) => row is null ? WhiteboardState.Empty :
        JsonSerializer.Deserialize<WhiteboardState>(row.State, FinanceRules.Json) ?? throw new FinanceException("Stored whiteboard is damaged.");
    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
}
