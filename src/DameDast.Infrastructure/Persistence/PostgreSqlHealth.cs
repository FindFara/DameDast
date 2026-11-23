using DameDast.Application.Interfaces.Common;
using Microsoft.EntityFrameworkCore;

namespace DameDast.Infrastructure.Persistence;

public sealed class PostgreSqlHealth(IDbContextFactory<FinanceDb> factory) : IDatabaseHealth
{
    public async Task<bool> CanConnectAsync(CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        return await db.Database.CanConnectAsync(cancellationToken);
    }
}
