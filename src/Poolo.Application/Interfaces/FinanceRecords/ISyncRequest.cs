using Poolo.Application.Features.FinanceRecords.Models;

namespace Poolo.Application.Interfaces.FinanceRecords;

public interface ISyncRequest
{
    SyncRequest Input { get; }
}
