using DameDast.Application.Interfaces.FinanceRecords;
using DameDast.Application.Interfaces.Market;
using DameDast.Application.Interfaces.Reminders;
using DameDast.Application.Features.FinanceRecords.Models;
using DameDast.Domain;
using DameDast.Common;

namespace DameDast.Application.Services;

public sealed class FinanceService(IFinanceRepository repository, TimeProvider clock) : IFinanceService
{
    public Task<Snapshot> ReadAsync(string userId, CancellationToken cancellationToken) => repository.ReadAsync(userId, cancellationToken);
    public Task<Snapshot> SyncAsync(string userId, SyncRequest request, CancellationToken cancellationToken)
    {
        if (request.Changes.Any(change => !change.Delete && change.Kind == "habitLog" && FinanceRules.Read<HabitLog>(change.Data).Date > clock.TehranToday()))
            throw new FinanceException("This habit date is invalid or already recorded.");
        return repository.ApplyAsync(userId, request.Changes, cancellationToken);
    }
}
