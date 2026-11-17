using DameDast.Application.Features.FinanceRecords.Models;

namespace DameDast.Application.Interfaces.FinanceRecords;

public interface ISyncRequest
{
    SyncRequest Input { get; }
}
