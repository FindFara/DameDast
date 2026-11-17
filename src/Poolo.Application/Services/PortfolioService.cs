using Poolo.Application.Interfaces.Portfolio;
using Poolo.Application.Interfaces.FinanceRecords;
using Poolo.Application.Interfaces.Market;
using Poolo.Application.Interfaces.Reminders;
using Poolo.Application.Features.FinanceRecords.Models;
using Poolo.Common;
using Poolo.Domain;

namespace Poolo.Application.Services;

public sealed class PortfolioService(IFinanceRepository repository, TimeProvider clock) : IPortfolioService
{
    public async Task<Snapshot> ReadAsync(string userId, CancellationToken cancellationToken) => Filter(await repository.ReadAsync(userId, cancellationToken));
    public async Task<Snapshot> SyncAsync(string userId, SyncRequest request, CancellationToken cancellationToken)
    {
        if (request.Changes.Any(x => x.Kind != "externalSnapshot"))
            throw new FinanceException("Invalid portfolio changes.");
        foreach (var change in request.Changes.Where(x => !x.Delete))
            if (FinanceRules.Read<ExternalSnapshot>(change.Data).CapturedAt > clock.UtcNow().AddMinutes(5))
                throw new FinanceException("Capture time is in the future.");
        return Filter(await repository.ApplyAsync(userId, request.Changes, cancellationToken));
    }

    private static Snapshot Filter(Snapshot snapshot) => snapshot with
    {
        Records = snapshot.Records.Where(x => x.Kind == "externalSnapshot").ToList()
    };
}
