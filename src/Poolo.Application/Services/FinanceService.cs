using Poolo.Application.Interfaces.FinanceRecords;
using Poolo.Application.Interfaces.Market;
using Poolo.Application.Interfaces.Reminders;
using Poolo.Application.Features.FinanceRecords.Models;

namespace Poolo.Application.Services;

public sealed class FinanceService(IFinanceRepository repository) : IFinanceService
{
    public Task<Snapshot> ReadAsync(string userId, CancellationToken cancellationToken) => repository.ReadAsync(userId, cancellationToken);
    public Task<Snapshot> SyncAsync(string userId, SyncRequest request, CancellationToken cancellationToken) => repository.ApplyAsync(userId, request.Changes, cancellationToken);
}
