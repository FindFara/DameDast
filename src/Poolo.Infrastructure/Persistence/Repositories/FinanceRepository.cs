using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Poolo.Application.Interfaces.FinanceRecords;
using Poolo.Application.Interfaces.Market;
using Poolo.Application.Interfaces.Reminders;
using Poolo.Application.Features.FinanceRecords.Models;
using Poolo.Common;
using Poolo.Domain;

namespace Poolo.Infrastructure.Persistence.Repositories;

public sealed class FinanceRepository(IDbContextFactory<FinanceDb> factory, TimeProvider clock) : IFinanceRepository
{
    public async Task<Snapshot> ReadAsync(string userId, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        var row = await db.Ledgers.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        return ToSnapshot(row);
    }

    public async Task<Snapshot> ApplyAsync(string userId, IReadOnlyList<Mutation> changes, CancellationToken cancellationToken)
    {
        for (var attempt = 0; ; attempt++)
        {
            try
            {
                return await ApplyOnceAsync(userId, changes, cancellationToken);
            }
            catch (DbUpdateConcurrencyException) when (attempt < 4)
            {
            }
            catch (DbUpdateException ex) when (attempt < 4 && ex.InnerException is SqliteException { SqliteErrorCode: 5 or 6 or 19 })
            {
            }
            catch (SqliteException ex) when (attempt < 4 && ex.SqliteErrorCode is 5 or 6)
            {
            }

            await Task.Delay(TimeSpan.FromMilliseconds(40 * (attempt + 1)), cancellationToken);
        }
    }

    private async Task<Snapshot> ApplyOnceAsync(string userId, IReadOnlyList<Mutation> changes, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var row = await db.Ledgers.SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (row is null)
        {
            row = new LedgerRow
            {
                UserId = userId
            };
            db.Ledgers.Add(row);
        }

        var records = ToSnapshot(row).Records.ToList();
        var ids = changes.Select(x => x.OperationId).ToArray();
        var receipts = await db.Receipts.Where(x => x.UserId == userId && ids.Contains(x.OperationId)).ToDictionaryAsync(x => x.OperationId, cancellationToken);
        var applied = false;
        foreach (var change in changes)
        {
            var payload = JsonSerializer.Serialize(change, FinanceRules.Json);
            if (receipts.TryGetValue(change.OperationId, out var receipt))
            {
                if (receipt.Payload != payload)
                    throw new FinanceException("An operation ID was reused with different data.");
                continue;
            }

            var updated = FinanceRules.Apply(records, change);
            records.RemoveAll(x => x.Id == change.Id);
            records.Add(updated);
            db.Receipts.Add(new Receipt { UserId = userId, OperationId = change.OperationId, Payload = payload });
            applied = true;
        }

        if (applied)
        {
            row.Revision++;
            row.State = JsonSerializer.Serialize(records, FinanceRules.Json);
            row.UpdatedAt = clock.UtcNow();
        }

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new Snapshot(row.Revision, records);
    }

    private static Snapshot ToSnapshot(LedgerRow? row) => row is null ? new Snapshot(0, []) : new Snapshot(row.Revision, JsonSerializer.Deserialize<List<FinanceRecord>>(row.State, FinanceRules.Json) ?? []);
}
