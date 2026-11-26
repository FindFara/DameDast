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
        var today = clock.TehranToday();
        foreach (var change in request.Changes) ValidateChangeDate(change, today);
        return repository.ApplyAsync(userId, request.Changes, cancellationToken);
    }

    private static void ValidateChangeDate(Mutation change, DateOnly today)
    {
        if (change.Delete) return;
        if (change.Kind == "habitLog" && FinanceRules.Read<HabitLog>(change.Data).Date > today)
            throw new FinanceException("This habit date is invalid or already recorded.");
        if (change.Kind == "developmentEntry")
        {
            var entry = FinanceRules.Read<DevelopmentEntry>(change.Data);
            if (entry.Done && entry.Date > today)
                throw new FinanceException("Future activities cannot be completed yet.");
        }
        if (change.Kind == "weightEntry" && FinanceRules.Read<WeightMeasurement>(change.Data).Date > today)
            throw new FinanceException("Future activities cannot be completed yet.");
    }

}
