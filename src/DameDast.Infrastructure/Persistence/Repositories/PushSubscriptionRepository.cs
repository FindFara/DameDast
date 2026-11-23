using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using DameDast.Application.Interfaces.FinanceRecords;
using DameDast.Application.Interfaces.Market;
using DameDast.Application.Interfaces.Reminders;
using DameDast.Application.Features.Reminders.Models;

namespace DameDast.Infrastructure.Persistence.Repositories;

public sealed class PushSubscriptionRepository(IDbContextFactory<FinanceDb> factory) : IPushSubscriptionRepository
{
    public async Task UpsertAsync(string userId, PushRegistration registration, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        var id = EndpointId(registration.Endpoint);
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "Subscriptions" ("Id", "UserId", "Endpoint", "Auth", "P256dh", "Language")
            VALUES ({id}, {userId}, {registration.Endpoint}, {registration.Keys.Auth}, {registration.Keys.P256dh}, {registration.Language})
            ON CONFLICT ("Id") DO UPDATE SET
                "UserId" = EXCLUDED."UserId", "Endpoint" = EXCLUDED."Endpoint",
                "Auth" = EXCLUDED."Auth", "P256dh" = EXCLUDED."P256dh", "Language" = EXCLUDED."Language"
            """, cancellationToken);
    }

    public async Task RemoveAsync(string userId, string endpoint, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        var id = EndpointId(endpoint);
        await db.Subscriptions.Where(x => x.Id == id && x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<PushDevice>> ReadAllAsync(CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        return await db.Subscriptions.AsNoTracking().Select(x => new PushDevice(x.Id, x.UserId, x.Endpoint, x.P256dh, x.Auth, x.Language)).ToListAsync(cancellationToken);
    }

    private static string EndpointId(string endpoint) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(endpoint)));
}
