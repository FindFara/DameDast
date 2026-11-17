using Poolo.Application.Features.FinanceRecords.Models;
using Poolo.Domain;

namespace Poolo.Application.Interfaces.FinanceRecords;

public interface IFinanceRepository
{
    Task<Snapshot> ReadAsync(string userId, CancellationToken cancellationToken);
    Task<Snapshot> ApplyAsync(string userId, IReadOnlyList<Mutation> changes, CancellationToken cancellationToken);
}
