using DameDast.Application.Features.FinanceRecords.Models;

namespace DameDast.Application.Interfaces.FinanceRecords;

public interface IFinanceService
{
    Task<Snapshot> ReadAsync(string userId, CancellationToken cancellationToken);
    Task<Snapshot> SyncAsync(string userId, SyncRequest request, CancellationToken cancellationToken);
}
