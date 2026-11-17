using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Poolo.Application.Interfaces.FinanceRecords;
using Poolo.Application.Interfaces.Market;
using Poolo.Application.Interfaces.Reminders;
using Poolo.Application.Features.Reminders.Models;

namespace Poolo.Infrastructure.Persistence.Repositories;

public sealed class PushSubscriptionRepository(IDbContextFactory<FinanceDb> factory) : IPushSubscriptionRepository
{
    public async Task UpsertAsync(string userId, PushRegistration registration, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        var id = EndpointId(registration.Endpoint);
        var row = await db.Subscriptions.FindAsync([id], cancellationToken);
        if (row is null)
        {
            row = new DeviceSubscription
            {
                Id = id
            };
            db.Subscriptions.Add(row);
        }

        row.UserId = userId;
        row.Endpoint = registration.Endpoint;
        row.Auth = registration.Keys.Auth;
        row.P256dh = registration.Keys.P256dh;
        row.Language = registration.Language;
        await db.SaveChangesAsync(cancellationToken);
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
