using DameDast.Application.Interfaces.FinanceRecords;
using DameDast.Application.Interfaces.Market;
using DameDast.Application.Interfaces.Reminders;
using DameDast.Application.Features.FinanceRecords.Models;

namespace DameDast.Application.Services;

public sealed class FinanceService(IFinanceRepository repository) : IFinanceService
{
    public Task<Snapshot> ReadAsync(string userId, CancellationToken cancellationToken) => repository.ReadAsync(userId, cancellationToken);
    public Task<Snapshot> SyncAsync(string userId, SyncRequest request, CancellationToken cancellationToken) => repository.ApplyAsync(userId, request.Changes, cancellationToken);
}
