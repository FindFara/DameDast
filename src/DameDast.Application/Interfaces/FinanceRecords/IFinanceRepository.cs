using DameDast.Application.Features.FinanceRecords.Models;
using DameDast.Domain;

namespace DameDast.Application.Interfaces.FinanceRecords;

public interface IFinanceRepository
{
    Task<Snapshot> ReadAsync(string userId, CancellationToken cancellationToken);
    Task<Snapshot> ApplyAsync(string userId, IReadOnlyList<Mutation> changes, CancellationToken cancellationToken);
}
