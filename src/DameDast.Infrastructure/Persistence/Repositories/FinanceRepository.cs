using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using DameDast.Application.Interfaces.FinanceRecords;
using DameDast.Application.Features.FinanceRecords.Models;
using DameDast.Common;
using DameDast.Domain;

namespace DameDast.Infrastructure.Persistence.Repositories;

public sealed class FinanceRepository(IDbContextFactory<FinanceDb> factory, TimeProvider clock) : IFinanceRepository
{
    public async Task<Snapshot> ReadAsync(string userId, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        var row = await db.Ledgers.AsNoTracking().Include(x => x.Records).AsSingleQuery()
            .SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        return ToSnapshot(row);
    }

    public Task<Snapshot> ApplyAsync(string userId, IReadOnlyList<Mutation> changes, CancellationToken cancellationToken) =>
        DatabaseWriteRetry.ExecuteAsync(() => ApplyOnceAsync(userId, changes, cancellationToken), cancellationToken);

    private async Task<Snapshot> ApplyOnceAsync(string userId, IReadOnlyList<Mutation> changes, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var row = await db.Ledgers.Include(x => x.Records).AsSingleQuery()
            .SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (row is null)
        {
            row = new LedgerRow
            {
                UserId = userId,
                UpdatedAt = clock.UtcNow()
            };
            db.Ledgers.Add(row);
        }

        var records = ToSnapshot(row).Records.ToList();
        var storedRecords = row.Records.ToDictionary(x => x.Id);
        var nextOrder = row.Records.Count == 0 ? 0 : row.Records.Max(x => x.SortOrder) + 1;
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

            if (!change.Delete && change.Kind == "note")
            {
                var previous = records.SingleOrDefault(x => x.Id == change.Id);
                NoteRules.ValidateTransition(previous is null ? null : FinanceRules.Read<PersonalNote>(previous.Data),
                    FinanceRules.Read<PersonalNote>(change.Data), clock.UtcNow());
            }
            foreach (var updated in FinanceRules.ApplyWithEffects(records, change))
            {
                records.RemoveAll(x => x.Id == updated.Id);
                records.Add(updated);
                if (!storedRecords.TryGetValue(updated.Id, out var stored))
                {
                    stored = new FinanceRecordRow { UserId = userId, Id = updated.Id };
                    row.Records.Add(stored);
                    storedRecords.Add(updated.Id, stored);
                }
                stored.UpdateFrom(updated, nextOrder++);
            }
            receipt = new Receipt { UserId = userId, OperationId = change.OperationId, Payload = payload };
            db.Receipts.Add(receipt);
            receipts.Add(receipt.OperationId, receipt);
            applied = true;
        }

        if (applied)
        {
            row.Revision++;
            row.UpdatedAt = clock.UtcNow();
        }

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new Snapshot(row.Revision, records);
    }

    private static Snapshot ToSnapshot(LedgerRow? row) => row is null ? new Snapshot(0, []) :
        new(row.Revision, row.Records.OrderBy(x => x.SortOrder).Select(x => x.ToDomain()).ToList());
}
