using Microsoft.EntityFrameworkCore;
using DameDast.Application.Interfaces.FinanceRecords;
using DameDast.Application.Interfaces.Market;
using DameDast.Application.Interfaces.Reminders;

namespace DameDast.Infrastructure.Persistence.Repositories;

public sealed class ReminderReceiptRepository(IDbContextFactory<FinanceDb> factory) : IReminderReceiptRepository
{
    public async Task<bool> ExistsAsync(string key, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        return await db.ReminderReceipts.AnyAsync(x => x.Key == key, cancellationToken);
    }

    public async Task RecordAsync(string key, DateTimeOffset sentAt, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        db.ReminderReceipts.Add(new ReminderReceipt { Key = key, SentAt = sentAt });
        await db.SaveChangesAsync(cancellationToken);
    }
}
